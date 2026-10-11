import os, re, json, hmac, hashlib, secrets, sqlite3
from datetime import datetime, timezone, timedelta

import numpy as np
import joblib
import jwt
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from tensorflow.keras.models import load_model

SECRET = os.getenv("JWT_SECRET", "change-this-secret-before-deploying")
DB_FILE = "app.db"

app = FastAPI(title="House Price Predictor")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

model = load_model("model/house_model.keras")
scaler = joblib.load("model/scaler.pkl")
columns = joblib.load("model/columns.pkl")
try:
    METRICS = json.load(open("model/metrics.json"))
except FileNotFoundError:
    METRICS = {}


# ---------- database ----------
def db():
    c = sqlite3.connect(DB_FILE)
    c.row_factory = sqlite3.Row
    return c


with db() as c:
    c.executescript("""
    CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY, name TEXT, email TEXT UNIQUE, salt TEXT, pw_hash TEXT, created TEXT);
    CREATE TABLE IF NOT EXISTS predictions(
        id INTEGER PRIMARY KEY, user_id INTEGER, inputs TEXT, price REAL, created TEXT);
    """)


def now():
    return datetime.now(timezone.utc).isoformat()


def hash_pw(pw, salt):
    return hashlib.pbkdf2_hmac("sha256", pw.encode(), bytes.fromhex(salt), 200_000).hex()


def make_token(uid):
    exp = datetime.now(timezone.utc) + timedelta(days=7)
    return jwt.encode({"sub": str(uid), "exp": exp}, SECRET, algorithm="HS256")


bearer = HTTPBearer()


def current_user(cred: HTTPAuthorizationCredentials = Depends(bearer)):
    try:
        return int(jwt.decode(cred.credentials, SECRET, algorithms=["HS256"])["sub"])
    except jwt.PyJWTError:
        raise HTTPException(401, "Session expired. Please log in again.")


# ---------- schemas ----------
class Signup(BaseModel):
    name: str = Field(min_length=2, max_length=40)
    email: str
    password: str = Field(min_length=6, max_length=100)


class Login(BaseModel):
    email: str
    password: str


class House(BaseModel):
    OverallQual: int = Field(ge=1, le=10)
    GrLivArea: float = Field(ge=300, le=6000)
    GarageCars: int = Field(ge=0, le=4)
    TotalBsmtSF: float = Field(ge=0, le=4000)
    FullBath: int = Field(ge=0, le=4)
    YearBuilt: int = Field(ge=1870, le=2030)


# ---------- auth ----------
@app.post("/auth/signup")
def signup(b: Signup):
    email = b.email.strip().lower()
    if not re.fullmatch(r"\S+@\S+\.\S+", email):
        raise HTTPException(422, "Enter a valid email address.")
    salt = secrets.token_hex(16)
    try:
        with db() as c:
            cur = c.execute("INSERT INTO users(name,email,salt,pw_hash,created) VALUES(?,?,?,?,?)",
                            (b.name.strip(), email, salt, hash_pw(b.password, salt), now()))
    except sqlite3.IntegrityError:
        raise HTTPException(409, "An account with this email already exists. Log in instead.")
    return {"token": make_token(cur.lastrowid), "user": {"name": b.name.strip(), "email": email}}


@app.post("/auth/login")
def login(b: Login):
    with db() as c:
        u = c.execute("SELECT * FROM users WHERE email=?", (b.email.strip().lower(),)).fetchone()
    if not u or not hmac.compare_digest(u["pw_hash"], hash_pw(b.password, u["salt"])):
        raise HTTPException(401, "Wrong email or password.")
    return {"token": make_token(u["id"]), "user": {"name": u["name"], "email": u["email"]}}


# ---------- prediction ----------
@app.get("/")
def home():
    return {"message": "House Price API is running"}


@app.post("/predict")
def predict(house: House, uid: int = Depends(current_user)):
    data = house.model_dump()
    x = scaler.transform(np.array([[data[c] for c in columns]]))
    price = float(np.expm1(model.predict(x, verbose=0)[0][0]))
    with db() as c:
        cur = c.execute("INSERT INTO predictions(user_id,inputs,price,created) VALUES(?,?,?,?)",
                        (uid, json.dumps(data), price, now()))
    mae = METRICS.get("models", {}).get("Neural Network", {}).get("mae")
    return {"id": cur.lastrowid, "predicted_price": round(price, 2), "mae": mae}


@app.get("/predictions")
def predictions(uid: int = Depends(current_user)):
    with db() as c:
        rows = c.execute("SELECT * FROM predictions WHERE user_id=? ORDER BY id DESC LIMIT 100", (uid,)).fetchall()
    return [{"id": r["id"], "price": r["price"], "created": r["created"], **json.loads(r["inputs"])} for r in rows]


@app.delete("/predictions/{pid}")
def delete_prediction(pid: int, uid: int = Depends(current_user)):
    with db() as c:
        c.execute("DELETE FROM predictions WHERE id=? AND user_id=?", (pid, uid))
    return {"deleted": pid}


@app.get("/dashboard")
def dashboard(uid: int = Depends(current_user)):
    with db() as c:
        rows = c.execute("SELECT price,created FROM predictions WHERE user_id=? ORDER BY id", (uid,)).fetchall()
    prices = [r["price"] for r in rows]
    return {
        "user": {
            "count": len(prices),
            "avg": float(np.mean(prices)) if prices else 0,
            "max": max(prices) if prices else 0,
            "series": [{"t": r["created"], "price": r["price"]} for r in rows[-20:]],
        },
        "model": METRICS,
    }