
from fastapi import FastAPI
from pydantic import BaseModel

# source .venv/bin/activate
# uvicorn first:app --reload

class User(BaseModel):
    id: int
    name: str
    email: str

def test_func(a:int)->int:
    return a

return_val = test_func(5)   

app = FastAPI()

@app.get("/user/me", response_model=User)
def get_home():
    user = User(id=1, name="John Doe", email="as@er.com")
    return user