import os
import json
import asyncio
from typing import Dict, Any, Optional, List
from urllib.parse import urlencode, quote
from datetime import datetime as dtm, timedelta
import base64

import httpx
from fastapi import (APIRouter, FastAPI, Body, Path, Query, 
	Header, HTTPException, Request, UploadFile, File)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse, Response
from sse_starlette.sse import EventSourceResponse

from libdborderlog import *
from libdbentity import *
from libpx import *
from librfq import *
from libcfxglobal import *
from libdbdocument import *
from libqueue import *
from libdboperations import *
from libutil import util_partners_by_broker_get
from libdbevents import dbevents_publish_quotebot_event

import time

ID_BANK_FIBRA = "00000000000007"

UPSTREAM_SCHEME = os.getenv("API_PROTOCOL", "http")
UPSTREAM_HOST   = os.getenv("API_HOST",   "35.209.147.53")
UPSTREAM_PREFIX = os.getenv("API_VERSION", "/apiv1.3/octax")

BASE_URL = f"{UPSTREAM_SCHEME}://{UPSTREAM_HOST}{UPSTREAM_PREFIX}"

HTTPX_TIMEOUT = httpx.Timeout(10.0, connect=5.0, read=30.0)

router = APIRouter(prefix="/v1/clearfxai")

client = httpx.AsyncClient(timeout=HTTPX_TIMEOUT, verify=True)

SUPPORTED_SPOT_PAIRS = {
	"USD": CFX_FXPAIR_USDBRL,
	"EUR": CFX_FXPAIR_EURBRL,
}

def validate_pair_currency(payload: Dict[str, Any]) -> None:
	"""Reject ambiguous or contradictory money fields before creating an RFQ."""
	currency = str(payload.get("rfq_orderqty_ccy") or "").strip().upper()
	pair = str(payload.get("rfq_symbol") or "").strip().upper()
	if not currency or not pair:
		raise HTTPException(status_code=400, detail="rfq_orderqty_ccy and rfq_symbol are required")
	expected_pair = SUPPORTED_SPOT_PAIRS.get(currency)
	if expected_pair is None:
		raise HTTPException(status_code=400, detail=f"Unsupported quote currency: {currency}")
	if pair != expected_pair:
		raise HTTPException(
			status_code=400,
			detail=f"Currency/pair mismatch: {currency} must use {expected_pair}",
		)
	payload["rfq_orderqty_ccy"] = currency
	payload["rfq_symbol"] = pair

def upstream(path: str) -> str:
	return f"{BASE_URL}/{path}"

def forward_headers(request: Request) -> Dict[str, str]:
	hop_by_hop = {
		"connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
		"te", "trailers", "transfer-encoding", "upgrade"
	}
	headers = {}
	for k, v in request.headers.items():
		lk = k.lower()
		if lk not in hop_by_hop:
			headers[k] = v
	headers.setdefault("Content-Type", "application/json")
	return headers

@router.post("/new")
async def rfq_new(request: Request, banksId: str, payload: Dict[str, Any] = Body(...)):
	try:
		validate_pair_currency(payload)
		broker_id = payload.get("broker_id")
		broker = dbentity_broker_fetch(broker_id)
		if broker is None:
			raise HTTPException(status_code=404, detail="Broker not found")
		spread, spread_broker = rfq_spread_get(broker_id)

		broker_id_queue = broker_id
		if broker.get("partmaster_id") != PARTNERSHIP_MASTER:
			broker_id_queue = broker.get("partmaster_id")

		banksId_list = [name.strip() for name in banksId.split(",") if name.strip()]

		if ID_BANK_FIBRA in banksId_list:
			banksId_list = [ID_BANK_FIBRA] + [b for b in banksId_list if b != ID_BANK_FIBRA]

		client_cnpj = payload.get("client_id")
		client_id = dbentity_get_id_by_cnpj(client_cnpj)
		client_ = dbentity_company_fetch(client_id)
		if client_ is None:
			raise HTTPException(status_code=404, detail="Company not found")

		if client_.get("blocked") == 1:
			raise HTTPException(status_code=403, detail="Quote unavailable: broker paused your access. Please contact them.")

		if not banksId_list:
			raise HTTPException(status_code=400, detail="No bank selected for this quote")

		# Resolved up front, not inside the loop: each bank writes its own orderlog
		# entry, so a bad id found halfway leaves a half-registered RFQ behind.
		# devSafra is the one bank with no entity record of its own.
		banks = {bankId: dbentity_bank_fetch(bankId) for bankId in banksId_list}
		unknown = [bankId for bankId, b in banks.items() if b is None and bankId != ID_BANK_FIBRA]
		if unknown:
			raise HTTPException(status_code=404, detail=f"BankId {', '.join(unknown)} not found")

		results = None
		results_dev = None
		rfq_id = None
		for bankId in banksId_list:

			try:
				# ------- 1) pricer --------
				b = banks[bankId]
				# if b is not None and payload.get("rfq_security") == CFX_SECURITY_FXSPOT:
				if b is not None:
					data = rfq_new_response(payload)
					if rfq_id is not None:
						data['rfq_id'] = rfq_id
					if rfq_id is None:
						rfq_id = data.get('rfq_id')
					_, rfq = rfq_register_orderlog(payload, data, client_, bankId, spread=spread, spread_broker=spread_broker)
					rfq_insert_quote(rfq, bankId, b.get('name'))
					results = data
					if b.get('is_override') == MODE_BRKOVERRIDE:
						operation = operations_get(rfq.operation_id)
      
						if operation is None: 
							raise HTTPException(status_code=404, detail="Operation not found")
						quote_data = {
							**data,
							"rfq_taker_id": rfq.rfq_taker_id,
							"bank_id": bankId,
							"rfq_side": payload.get("rfq_side"),
							"rfq_spotsett": payload.get("rfq_spotsett"),
							"partmaster_id": broker.get("partmaster_id"),
							"broker_name": broker.get("name"),
							"operation_id": rfq.operation_id,
							"operation_alias": operation.alias,
							"operation_type": operation.operation_type,
						}
						queue_publish_rfq_to_manual_price(broker_id_queue, quote_data)
					continue

				# ------- 2) devSafra --------
				resp = await client.post(
					upstream("rfq/new"),
					json=payload,
					headers=forward_headers(request)
				)
				resp.raise_for_status()
				data = resp.json()

				rfq_id = data.get('rfq_id')
				_, rfq = rfq_register_orderlog(payload, data, client_, bankId, spread=spread, spread_broker=spread_broker)
				rfq_insert_quote(rfq, bankId, "Banco Fibra")

				results_dev = data

			except httpx.HTTPStatusError as e:
				raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
			except HTTPException:
				raise
			except Exception as e:
				raise HTTPException(status_code=502, detail=f"Upstream error: {e}")

		if results_dev:
			results = results_dev
		if results is None:
			# A 200 with an empty body reads as a successful RFQ to the caller, who
			# then has no rfq_id and no reason why. Better to return an error code.
			raise HTTPException(status_code=502, detail="No bank returned a quote")
		return JSONResponse(content=results, status_code=200)

	except HTTPException:
		raise
	except Exception as e:
		raise HTTPException(status_code=502, detail=f"Upstream error: {e}")

@router.post("/quoteonce")
async def rfq_quoteonce(request: Request, payload: Dict[str, Any] = Body(...), mode: str = Query("path", enum=["path", "body"])):
	try:
		if mode == "path":
			encoded = quote(json.dumps(payload, separators=(',', ':')))
			url = upstream(f"rfq/quoteonce/{encoded}")
			resp = await client.post(url, headers=forward_headers(request))
		else:
			url = upstream("rfq/quoteonce")
			resp = await client.post(url, json=payload, headers=forward_headers(request))

		resp.raise_for_status()
		try:
			return JSONResponse(content=resp.json(), status_code=resp.status_code)
		except ValueError:
			return StreamingResponse(iter([resp.text]), status_code=resp.status_code, media_type=resp.headers.get("content-type", "text/plain"))
	except httpx.HTTPStatusError as e:
		raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
	except Exception as e:
		raise HTTPException(status_code=502, detail=f"Upstream error: {e}")

def process_chunk(chunk: bytes):
	text = chunk.decode("utf-8").strip()
	lines = text.splitlines()

	event = None
	for line in lines:
		if line.startswith("event: "):
			event = line[len("event: "):].strip()
			if event != "QUOTE_EVENT":
				return chunk
		elif line.startswith("data: "):
			data_str = line[len("data: "):].strip()
			try:
				data = json.loads(data_str)
				rfq_id = data.get("rfq_id")
				if not rfq_id:
					return chunk

				# update rfq to orderlog
				rfq = orderlog_itemget(rfq_id)
				rfq.rfq_px_bank = data.get("rfq_quote_px")
				rfq.rfq_status = data.get("rfq_status")
				# rfq.rfq_quote_id = data.get("rfq_quote_id")
				rfq.rfq_px = px_client(rfq.rfq_px_bank, rfq.rfq_side, rfq.rfq_spread)
				orderlog_itemput(rfq)
				rfq_insert_quote(rfq, ID_BANK_FIBRA, "Banco Fibra", quote_id=data.get("rfq_quote_id"))

				data["rfq_quote_px_old"] = rfq.rfq_px_bank
				data["rfq_quote_px"] = rfq.rfq_px 
				# new_chunk = f"event: {event}\ndata: {json.dumps(data)}\n\n"
				data = rfq_quote_etl_by_rfq_quote(rfq.rfq_id)
				new_chunk = f"event: {event}\ndata: {json.dumps(data)}\n\n"
				return new_chunk.encode()
			except json.JSONDecodeError:
				pass

@router.get("/quotefeed/{rfq_id}")
async def rfq_quotefeed(request: Request, banksId: str, rfq_id: str = Path(...)):
	banksId_list = [name.strip() for name in banksId.split(",") if name.strip()]
	rfq = orderlog_itemget(rfq_id)
	if rfq == -1:
		raise HTTPException(404, "Rfq not found")
	
	broker_id = rfq.broker_id
	broker = dbentity_broker_fetch(broker_id)
	if broker is None:
		raise HTTPException(status_code=404, detail="Broker not found")

	async def sequential_stream():
		while not await request.is_disconnected():
			current_rfq = orderlog_itemget(rfq_id)
			if current_rfq == -1:
				return

			if str(current_rfq.rfq_status).upper() == "CANCELLED":
				payload = json.dumps({
					"rfq_id": rfq_id,
					"rfq_status": "CANCELLED",
					"rfq_cancel_reason": "user_closed_modal",
					"rfq_quote": [],
				}, separators=(",", ":"))
				yield f"event: QUOTE_EVENT\ndata: {payload}\n\n".encode("utf-8")
				return

			for bank_id in banksId_list:
				try:
					# --- DEVSAFRA (stream upstream) ---
					if bank_id == ID_BANK_FIBRA:
						url = upstream(f"rfq/quotefeed/{rfq_id}")
						async with client.stream(
							"GET",
							url,
							headers={"Accept": "text/event-stream"},
							timeout=None,
						) as r:
							async for chunk in r.aiter_bytes():
								if await request.is_disconnected():
									return
								new_chunk = process_chunk(chunk)
								yield new_chunk
								break

					# --- NEW PRICER ---
					else:
						current_rfq = orderlog_itemget(rfq_id)
						b = dbentity_bank_fetch(bank_id)
						if not b:
							continue

						if current_rfq.rfq_status in ("CANCELLED", "REJECTED"):
							data = rfq_quote_etl_by_rfq_quote(rfq_id)
							payload = json.dumps(data, separators=(",", ":"))
							yield f"event: QUOTE_EVENT\ndata: {payload}\n\n".encode()
							return

						msg = None
						rfq_quote_manual = current_rfq.rfq_quote_manual.get(bank_id)
						if current_rfq.rfq_security != CFX_SECURITY_FXNDF and \
							rfq_quote_manual == None and \
							b.get('is_override') == MODE_BANKAUTO:

							msg = rfq_automatic_quote(b, bank_id, current_rfq)
							#msg = rfq_manual_quote(b, bank_id, current_rfq)

						if rfq_quote_manual != None and b.get('is_override') != MODE_BANKAUTO:
							msg = rfq_manual_quote(b, bank_id, current_rfq)

						if msg is None:
							continue

						yield msg.encode()

				except Exception as e:
					err = f"event: error\ndata: {json.dumps({'bank_id': bank_id,'error': str(e)})}\n\n"
					yield err.encode()

			await asyncio.sleep(1.0)

	return StreamingResponse(
		sequential_stream(),
		media_type="text/event-stream",
		headers={
			"Cache-Control": "no-cache",
			"Connection": "keep-alive",
		}
	)

# @router.get("/quotefeed/{rfq_id}")
# async def rfq_quotefeed(request: Request, rfq_id: str = Path(...)):
# 	rfq = orderlog_itemget(rfq_id)
# 	if rfq == -1:
# 		raise HTTPException(status_code=404, detail="Rfq not found")
# 	b = dbentity_bank_fetch(rfq.bank_id)

# 	## Pricer
# 	async def pricer_producer():
# 		current_rfq = rfq
# 		try:
# 			while not await request.is_disconnected():
# 				b = dbentity_bank_fetch(current_rfq.bank_id)
# 				current_rfq = rfq_generate_quote(b, current_rfq)
# 				data = rfq_quote_etl(current_rfq)
# 				payload = json.dumps(data, separators=(",", ":"))
# 				sse = f"event: QUOTE_EVENT\ndata: {payload}\n\n"
# 				yield sse.encode("utf-8")
# 				await asyncio.sleep(2.0)
# 		except asyncio.CancelledError:
# 			return
# 		except Exception as e:
# 			err = f"event: error\ndata: {json.dumps({'source':'pricer','status':500,'error':str(e)})}\n\n"
# 			yield err.encode("utf-8")

# 	## devsafra
# 	url = upstream(f"rfq/quotefeed/{rfq_id}")
# 	async def upstream_stream():
# 		try:
# 			async with client.stream(
# 				"GET",
# 				url,
# 				headers={**forward_headers(request), "Accept": "text/event-stream"},
# 				timeout=None,
# 			) as r:
# 				r.raise_for_status()
# 				async for chunk in r.aiter_bytes():
# 					if await request.is_disconnected():
# 						break
# 					new_chunk = process_chunk(chunk)
# 					yield new_chunk
# 		except httpx.HTTPStatusError as e:
# 			err = f"event: error\ndata: {json.dumps({'status': e.response.status_code, 'error': e.response.text})}\n\n"
# 			yield err.encode()
# 		except Exception as e:
# 			err = f"event: error\ndata: {json.dumps({'status': 502, 'error': str(e)})}\n\n"
# 			yield err.encode()
	
# 	func = upstream_stream
# 	if b is not None:
# 		func = pricer_producer

# 	return StreamingResponse(
# 		func(),
# 		media_type="text/event-stream",
# 		headers={
# 			"Cache-Control": "no-cache",
# 			"Connection": "keep-alive",
# 		},
# 	)

async def get_cancel(rfq_id, payload = None, rfq_venue_id = None):
	if not payload:
		payload = {
			"rfq_id": rfq_id,
			"rfq_venue_id": rfq_venue_id,
			"rfq_venue_secret": "",
			"rfq_cancel_time": time.time(),
			"rfq_cancel_message": "Taker manually declined quoted price",
		}
	url = upstream(f"rfq/cancel/{rfq_id}")
	resp = await client.post(url, json=payload)
	resp.raise_for_status()
	return JSONResponse(content=resp.json(), status_code=resp.status_code)

@router.post("/neworder/{rfq_id}")
async def rfq_neworder(request: Request, rfq_id: str = Path(...), payload: Optional[Dict[str, Any]] = Body(None)):
	try:
		rfq = orderlog_itemget(rfq_id)
		if rfq == -1:
			raise HTTPException(status_code=404, detail="Rfq not found")

		# Change the state to DEAL, blocking quote editing.
		rfq.rfq_status = "DEAL"
		orderlog_itemput(rfq)
		rfq = orderlog_itemget(rfq_id)	

		bank_id = payload.get("bank_id")
		rfq.bank_id = bank_id
		rfq.rfq_px_bank = rfq.rfq_quote.get(bank_id, {}).get("rfq_px_bank")
		rfq.rfq_quote_id = rfq.rfq_quote.get(bank_id, {}).get("rfq_quote_id")
		rfq.rfq_px = rfq.rfq_quote.get(bank_id, {}).get("rfq_px")
		rfq.rfq_spread_broker = rfq.rfq_quote.get(bank_id, {}).get("rfq_spread_broker")
		rfq.rfq_spread = rfq.rfq_quote.get(bank_id, {}).get("rfq_spread")
		b = dbentity_bank_fetch(bank_id)

		## Pricer
		if b is not None:
			if ID_BANK_FIBRA in rfq.rfq_quote:
				await get_cancel(rfq_id, rfq_venue_id=payload.get("rfq_venue_id"))
			rfq.rfq_status = "DEAL"

			orderlog_itemput(rfq)
			data = rfq_neworder_etl(rfq)
			dbevents_publish_quotebot_event("rfq.dealt", rfq_id=rfq_id, bank_id=bank_id, rfq_px=rfq.rfq_px)
			return JSONResponse(content=data)

		## devsafra
		url = upstream(f"rfq/neworder/{rfq_id}")
		resp = await client.post(url, json=payload, headers=forward_headers(request))
		resp.raise_for_status()
		data = resp.json()

		# update rfq to orderlog
		rfq.rfq_status = data.get("rfq_status")
		rfq.rfq_px_bank = data.get("rfq_deal_px")
		rfq.rfq_px = px_client(rfq.rfq_px_bank, rfq.rfq_side, rfq.rfq_spread)

		orderlog_itemput(rfq)

		return JSONResponse(content=data, status_code=resp.status_code)
	except httpx.HTTPStatusError as e:
		raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
	except HTTPException:
		raise
	except Exception as e:
		raise HTTPException(status_code=502, detail=f"Upstream error: {e}")

@router.post("/cancel/{rfq_id}")
async def rfq_cancel(request: Request, rfq_id: str = Path(...), payload: Optional[Dict[str, Any]] = Body(None)):
	try:
		rfq = orderlog_itemget(rfq_id)
		if rfq == -1:
			raise HTTPException(status_code=404, detail="Rfq not found")

		if ID_BANK_FIBRA in rfq.rfq_quote:
			## devsafra
			url = upstream(f"rfq/cancel/{rfq_id}")
			await client.post(url, json=payload, headers=forward_headers(request))

		## orderlog
		rfq.rfq_status = "CANCELLED"
		orderlog_itemput(rfq)
		data = rfq_cancel_etl(rfq)
		return JSONResponse(content=data)
	except httpx.HTTPStatusError as e:
		raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
	except HTTPException:
		raise
	except Exception as e:
		raise HTTPException(status_code=502, detail=f"Upstream error: {e}")

@router.get("/trading/blotter/fxspot/transactions/history/intraday")
async def blotter_intraday(request: Request):
	try:
		qp = request.query_params
		url = upstream(f"trading/blotter/fxspot/transactions/history/intraday")
		resp = await client.get(url, params=qp, headers=forward_headers(request))
		resp.raise_for_status()
		return JSONResponse(content=resp.json(), status_code=resp.status_code)
	except httpx.HTTPStatusError as e:
		raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
	except Exception as e:
		raise HTTPException(status_code=502, detail=f"Upstream error: {e}")


# ---------------------------------------------------------------------------
# PUT /v1/clearfxai/documents/{rfq_id}
# Upload a single document for a specific RFQ
# ---------------------------------------------------------------------------
@router.put("/documents/{rfq_id}")
async def rfq_document_upload(
	request: Request,
	rfq_id: str = Path(...),
	doctype: str = Query(..., description="Document type (must match legal_entity_docs keys)"),
	file: UploadFile = File(...)
):
	# Validate RFQ exists
	rfq = orderlog_itemget(rfq_id)
	if rfq == -1:
		raise HTTPException(status_code=404, detail="RFQ not found")

	# Load or create document registry
	doc_entry = rfqdocuments_get(rfq_id)
	if doc_entry is None:
		doc_entry = rfqdocuments_create(rfq_id)

	# Validate doctype
	if doctype not in doc_entry.legal_entity_docs:
		raise HTTPException(
			status_code=400,
			detail=f"Invalid document type '{doctype}'. Must be one of: {list(doc_entry.legal_entity_docs.keys())}"
		)

	# Read file bytes
	content = await file.read()
	content_b64 = base64.b64encode(content).decode("ascii")

	# Store document metadata + data
	doc_entry.legal_entity_docs[doctype] = {
		"filename": file.filename,
		"mimetype": file.content_type,
		"uploaded_by": request.headers.get("X-User-Id", "unknown"),
		"timestamp": time.time(),
		"data": content_b64
	}

	rfqdocuments_put(doc_entry)

	return JSONResponse(content={
		"rfq_id": rfq_id,
		"doctype": doctype,
		"status": "uploaded",
		"filename": file.filename,
		"mimetype": file.content_type,
	})

# ---------------------------------------------------------------------------
# GET /v1/clearfxai/documents/{rfq_id}/{doctype}
# ---------------------------------------------------------------------------
@router.get("/documents/{rfq_id}/{doctype}")
async def download_rfq_document(rfq_id: str, doctype: str):
	entry = rfqdocuments_get(rfq_id)
	if entry is None:
		raise HTTPException(status_code=404, detail="RFQ not found")

	doc = entry.legal_entity_docs.get(doctype)
	if doc is None:
		raise HTTPException(status_code=404, detail="Document not found")

	content = base64.b64decode(doc["data"])

	return Response(
		content=content,
		media_type=doc["mimetype"],
		headers={
			"Content-Disposition": f"attachment; filename={doc['filename']}"
		}
	)

# ---------------------------------------------------------------------------
# GET /v1/clearfxai/documents/rfqs
# Get a list of RFQs with documents.
# ---------------------------------------------------------------------------
@router.get("/documents/rfqs")
def list_rfqs_with_documents():
	# Returns all RFQ IDs (today) that contain at least one saved document.

	# Get today's timestamp range
	today_str = dtm.now().strftime("%Y-%m-%d")
	ts_min = dtm.strptime(f"{today_str} 00:00:00", "%Y-%m-%d %H:%M:%S").timestamp()
	ts_max = dtm.strptime(f"{today_str} 23:59:59", "%Y-%m-%d %H:%M:%S").timestamp()

	# Get rfq_ids for today's range
	rfq_ids = orderlog_timeseries_range(ts_min, ts_max)
	if not rfq_ids:
		return {
			"rfq_ids": [],
			"count": 0
		}

	result = []
	for rfq_id in reversed(rfq_ids):
		entry = rfqdocuments_get(rfq_id)
		if entry is None:
			continue

		legal_docs = entry.legal_entity_docs
		
		# Check if at least one document is not None
		if any(value is not None for value in legal_docs.values()):
			result.append(entry.rfq_id)

	return {
		"rfq_ids": result,
		"count": len(result)
	}

@router.put("/quote_manual/{rfq_id}")
async def rfq_quote_manual_update(bank_id: str, quote_manual: Optional[float] = Query(None), rfq_id: str = Path(...)):
	rfq = orderlog_itemget(rfq_id)
	if rfq == -1:
		raise HTTPException(status_code=404, detail="Rfq not found")
	
	if bank_id not in rfq.rfq_quote:
		raise HTTPException(status_code=404, detail="Bank not found in rfq")

	rfq.rfq_quote_manual[bank_id] = quote_manual
	if orderlog_itemput(rfq) == -1:
		raise HTTPException(status_code=400, detail="update quote_manual fail")

	return {"message": "quote_manual saved successfully!"}

@router.get("/rfqs_update_price/{broker_id}")
def rfqs_update_price(broker_id: str):
	queue_name = f"{RFQ_MANUAL_PRICE_QUEUE}_{broker_id}"
	connection, channel = queue_connection_and_channel_get(queue_name)

	method_frame, header_frame, body = channel.basic_get(queue=queue_name, auto_ack=True)

	if method_frame is None:
		connection.close()
		return {"message": None }

	msg = json.loads(body.decode())

	connection.close()

	return { "message": msg }



app = FastAPI(
	root_path="/rfq",
	title='rfq API',
	description='description',
	version='1.0',
)

@app.on_event("shutdown")
async def shutdown_event():
	await client.aclose()

app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

app.include_router(router)
