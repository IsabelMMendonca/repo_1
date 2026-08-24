RFQ_ID="fe6da2d0975c495fa143a89905ca6ef0"
NEW_PRICE="5.1831"
EMAIL="YOUR_EMAIL"




docker exec -i \
  -e RFQ_ID="$RFQ_ID" \
  -e NEW_PRICE="$NEW_PRICE" \
  -e EMAIL="$EMAIL" \
  -w /app \
  rfxsolution-rfxplatform-api-1 python3 - <<'PY'
import os
from libdborderlog import (
    orderlog_itemget,
    orderlog_reconcil_sign_valid,
)

rfq_id = os.environ["RFQ_ID"]
new_price = float(os.environ["NEW_PRICE"])

rfq = orderlog_itemget(rfq_id)

if rfq == -1:
    raise Exception("RFQ not found")

print("RFQ:", rfq_id)
print("Status:", rfq.rfq_status)
print("Original price:", rfq.rfq_reconcil_pxo)
print("Current reconciled price:", rfq.rfq_px)
print("New price:", f"{new_price:.4f}")
print("Signature valid:", orderlog_reconcil_sign_valid(rfq))
PY



outcome 
Original price: ...
Current reconciled price: 5.1445
New price: 5.1831
Signature valid: True

docker exec -i \
  -e RFQ_ID="$RFQ_ID" \
  -e NEW_PRICE="$NEW_PRICE" \
  -e EMAIL="$EMAIL" \
  -w /app \
  rfxsolution-rfxplatform-api-1 python3 - <<'PY'
import os

from libdborderlog import (
    orderlog_itemget,
    orderlog_itemput2,
    orderlog_reconcil_px_update,
    orderlog_reconcil_sign_valid,
)

rfq_id = os.environ["RFQ_ID"]
new_price = float(os.environ["NEW_PRICE"])
email = os.environ["EMAIL"]

rfq = orderlog_itemget(rfq_id)

if rfq == -1:
    raise Exception("RFQ not found")

if rfq.rfq_status != "DEAL":
    raise Exception(f"RFQ is not DEAL: {rfq.rfq_status}")

if not rfq.rfq_reconcil_sign:
    raise Exception("RFQ was not previously reconciled")

if not orderlog_reconcil_sign_valid(rfq):
    raise Exception("Current reconciliation signature is invalid")

original_price = float(rfq.rfq_reconcil_pxo)

print("Current wrong price:", rfq.rfq_px)
print("Original price:", original_price)
print("Correcting to:", f"{new_price:.4f}")

# Undo previous reconciliation
rfq.rfq_px = original_price
rfq.rfq_reconcil_pxo = None
rfq.rfq_reconcil_sign = None

result = orderlog_itemput2(rfq)

if result == -1:
    raise Exception("Failed to restore pre-reconciliation state")

# Reconcile again through the real reconciliation function
result = orderlog_reconcil_px_update(
    rfq_id,
    email,
    new_price,
)

if result in (-1, -2, -3):
    raise Exception(f"Reconciliation failed: {result}")

print()
print("SUCCESS")
print(result)
PY