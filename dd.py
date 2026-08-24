#!/usr/bin/env python3
# fix_rfq_reconciliation.py - Correct a wrongly-entered reconciliation price on
# an already-reconciled RFQ.
#
# orderlog_reconcil_px_update() (libdborderlog.py) refuses a second
# reconciliation on the same RFQ -- once rfq.rfq_reconcil_sign is set, the real
# PUT /orderlog/{rfq_id}/reconcile endpoint returns 409. There is no "redo"
# path through the API, and hand-editing rfq_px in Redis is worse than doing
# nothing: the reconciliation signature is a hash over rfq_px/rfq_reconcil_pxo/
# etc (orderlog_reconcil_signable_data), and a value changed without
# regenerating that hash makes orderlog_reconcil_sign_valid() fail, which makes
# every reader (revenue, invoices, reports) silently fall back to the
# *pre-reconciliation* price -- not the wrong value, not the right one.
#
# This script does not reimplement that math. It reverts the RFQ to its
# pre-reconciliation state (original price, no signature) and then calls the
# real orderlog_reconcil_px_update() again with the correct price, so the
# split/hash/signature are produced by the exact same code path the API uses.
#
# Usage:
#   fix_rfq_reconciliation.py <rfq_id> <new_price> <operator_email> [-y]
#
#   rfq_id         32 hex (uuid4().hex, as minted in librfq.py). No other
#                  identifier is accepted.
#   new_price      the correct client rate, e.g. 5.1831
#   operator_email who authorized the correction -- recorded in the new
#                  reconciliation signature exactly like a normal reconcile.
#
#   Without -y the script only prints what it found and what it would do.
#   With -y it writes.

import argparse
import datetime
import os
import re
import sys

import redis

_here = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _here)
sys.path.insert(0, os.path.join(_here, ".."))

try:
    from libdborderlog import (
        orderlog_itemget,
        orderlog_itemput2,
        orderlog_reconcil_px_update,
        orderlog_reconcil_sign_valid,
    )
except ImportError as e:
    print(f"Error importing database library: {e}")
    sys.exit(1)

RFQ_ID_RE = re.compile(r"^[0-9a-f]{32}$")
ORDERLOG_KEY = "orderlog"  # DatabaseOrderLog.keydomain, libdborderlog.py:65
DEFAULT_BACKUP_DIR = "/data/rfq_reconcil_backups"  # /data is the redis-server volume, not /tmp


def fail(msg):
    sys.stderr.write(f"ERRO: {msg}\n")
    sys.exit(1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("rfq_id")
    ap.add_argument("new_price", type=float)
    ap.add_argument("operator_email")
    ap.add_argument("-y", dest="apply", action="store_true",
                     help="grava. Sem esta flag o script so mostra o plano.")
    ap.add_argument("--backup-dir", default=DEFAULT_BACKUP_DIR,
                     help=f"onde salvar o valor atual antes de escrever (default: {DEFAULT_BACKUP_DIR})")
    args = ap.parse_args()

    if not RFQ_ID_RE.match(args.rfq_id):
        fail(f"rfq_id invalido: '{args.rfq_id}' -- esperado 32 hex (uuid4 sem hifens)")

    rfq = orderlog_itemget(args.rfq_id)
    if rfq == -1:
        fail(f"RFQ nao encontrada: {args.rfq_id}")
    if rfq.rfq_status != "DEAL":
        fail(f"RFQ nao esta em status DEAL (status atual: {rfq.rfq_status})")
    if not rfq.rfq_reconcil_sign:
        fail("RFQ nunca foi reconciliada -- use o endpoint normal "
             f"PUT /orderlog/{args.rfq_id}/reconcile, este script e' so' para corrigir "
             "uma reconciliacao ja existente")
    if not orderlog_reconcil_sign_valid(rfq):
        fail("a assinatura de reconciliacao atual ja esta invalida (nao bate com os "
             "dados gravados) -- investigue antes de corrigir, o sistema ja esta "
             "caindo para o preco pre-reconciliacao em qualquer leitura")

    original_pxo = float(rfq.rfq_reconcil_pxo)
    current_wrong_px = float(rfq.rfq_px)

    print(f"rfq_id                              : {args.rfq_id}")
    print(f"preco original (pre-reconciliacao)  : {original_pxo:.4f}")
    print(f"preco reconciliado atual (a corrigir): {current_wrong_px:.4f}")
    print(f"preco novo (corrigido)              : {args.new_price:.4f}")
    print(f"operador da correcao                : {args.operator_email}")
    print()

    if not args.apply:
        print("Dry-run -- nada gravado. Rode de novo com -y para aplicar.")
        print()
        print(f"Antes de escrever, o valor atual do campo sera salvo em {args.backup_dir}/")
        print("para permitir rollback com um HSET, sem precisar restaurar o RDB inteiro.")
        print()
        print("O que -y faz: reverte a RFQ ao preco original (sem assinatura), grava,")
        print("e chama orderlog_reconcil_px_update() de novo com o preco corrigido --")
        print("a mesma funcao que o endpoint PUT /orderlog/{rfq_id}/reconcile usa --")
        print("para que o split e o hash sejam calculados exatamente como em producao.")
        return

    r = redis.Redis(host="localhost", port=6379, decode_responses=True)

    # Backup: o campo inteiro (JSON cru, como esta gravado agora) para um arquivo,
    # antes de tocar em qualquer coisa. Restaura com um HSET so' -- nao precisa
    # parar o redis-server nem mexer no RDB inteiro, porque a escrica e' so' este
    # campo deste hash.
    raw_before = r.hget(ORDERLOG_KEY, args.rfq_id)
    if not raw_before:
        fail("nao consegui ler o valor cru atual do orderlog para backup -- abortando "
             "sem escrever nada")
    os.makedirs(args.backup_dir, exist_ok=True)
    ts = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup_path = os.path.join(args.backup_dir, f"{args.rfq_id}_{ts}.json")
    with open(backup_path, "w") as fp:
        fp.write(raw_before)
    print(f"Backup gravado em: {backup_path}")
    print("Para reverter esta correcao (volta ao estado ATUAL, com o preco errado):")
    print(f"  redis-cli -x HSET {ORDERLOG_KEY} {args.rfq_id} < {backup_path} && redis-cli SAVE")
    print()

    # Passo 1: reverte para o estado pre-reconciliacao, para reabrir o guard de
    # "so uma vez" de orderlog_reconcil_px_update.
    rfq.rfq_px = original_pxo
    rfq.rfq_reconcil_pxo = None
    rfq.rfq_reconcil_sign = None
    if orderlog_itemput2(rfq) == -1:
        fail("falha ao reverter a RFQ para o preco original -- nada mais foi tentado, "
             f"investigue antes de rodar de novo. Backup intacto em {backup_path}")

    # Passo 2: reconcilia de novo com o preco correto, pela mesma funcao que o
    # endpoint real usa -- sem reimplementar split/hash aqui.
    result = orderlog_reconcil_px_update(args.rfq_id, args.operator_email, args.new_price)
    if result in (-1, -2, -3):
        fail(f"orderlog_reconcil_px_update falhou com codigo {result} -- a RFQ ficou "
             "revertida (preco original, sem reconciliacao), NAO no valor errado nem "
             f"no corrigido. Backup do estado anterior a este script em {backup_path}, "
             f"caso prefira voltar a ele em vez de fechar pelo PUT /orderlog/{args.rfq_id}/reconcile.")

    print("Reconciliacao corrigida:")
    print(result)

    r.save()
    print()
    print("SAVE executado -- gravado em disco.")
    print(f"Backup do estado anterior (preco errado) segue em: {backup_path}")


if __name__ == "__main__":
    main()
