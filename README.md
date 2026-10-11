# House Price Prediction

A web app that estimates what a house is worth based on its details. I built it to learn the whole machine learning process properly, from messy CSV to a working app that someone else could actually use.

You enter things like the overall quality, living area and year built, and the app gives you a price estimate. There's also a dashboard that shows how well the model is doing, so you don't have to just trust the number.

The model is trained on the Kaggle [House Prices](https://www.kaggle.com/c/house-prices-advanced-regression-techniques) dataset (housing data from Ames, Iowa).

## What it does

- Predicts a sale price from the house details you enter
- Lets you log in, so your estimates are your own
- Keeps a history of every estimate you've made
- Shows your stats: how many estimates, the average, the highest, and a chart of your last 20
- Shows how the model performs, with six charts:
  - accuracy (R²)
  - average error per model
  - which features matter most
  - the spread of sale prices in the data
  - actual vs predicted prices on houses the model never saw

## How well it works

I trained two models on the same data and compared them on a validation set.

| Model | R² | Average error (MAE) |
|---|---|---|
| Neural network | 0.877 | $19,643 |
| XGBoost | 0.862 | $19,516 |

The neural network explains about 88% of the variation in prices, and it's typically off by around $20k. XGBoost came out very close. It's slightly better on average error, but the neural network wins on R², so that's the one the app uses for predictions.

The features that move the price the most are overall quality, above-ground living area, basement size, year built and garage capacity. That matches what you'd expect.

One thing I wanted to understand properly was overfitting, so in notebook 05 I trained three versions of the network on purpose: one too small, one too big, and one in between. The small one barely learned anything, the big one memorised the training data and fell apart on new houses (its R² was hugely negative), and the middle one is the one I kept.

## Built with

- **Model:** Python, pandas, NumPy, scikit-learn, TensorFlow/Keras, XGBoost
- **Backend:** FastAPI
- **Frontend:** React with Recharts for the charts

## Project layout

```
house-price-app/
├── backend/
│   ├── main.py                  the API
│   └── model/
│       ├── house_model.keras    the trained neural network
│       ├── scaler.pkl           scaler fitted on the training data
│       ├── columns.pkl          feature names, in the right order
│       └── metrics.json         numbers the dashboard charts read
├── frontend/                    the React app
└── ml/
    ├── data/                    train.csv and the data description
    └── notebooks/
        ├── 01_eda.ipynb
        ├── 02_preprocessing.ipynb
        ├── 03_baseline_models.ipynb
        ├── 04_neural_network.ipynb
        └── 05_overfitting_underfitting.ipynb
```

## Running it yourself

You'll need Python 3.11 and Node.js installed.

**Get the code**

```bash
git clone https://github.com/MuhammadAbdullah-922/house-price-app.git
cd house-price-app
```

**Backend**

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

On macOS or Linux, activate with `source venv/bin/activate` instead.

The API runs on `http://localhost:8000`, and the auto-generated docs are at `http://localhost:8000/docs`.

**Frontend** (in a second terminal)

```bash
cd frontend
npm install
npm run dev
```

Then open `http://localhost:5173`.

**Retraining**

Run the notebooks in `ml/notebooks` in order. The last cells of notebook 05 save the model and write `metrics.json` into `backend/model`. The backend only reads that file when it starts, so restart it after retraining or the dashboard will show old numbers (I lost some time to this myself).

## A few things I learned building this

- The prices are heavily skewed, so I trained on `log1p(price)` and convert back with `expm1` when predicting. It made the model noticeably more stable.
- The scaler and column order have to match training exactly, which is why both are saved next to the model.
- The dashboard only works if `metrics.json` has exactly the shape the frontend expects. When a chart was empty, the fix was reading the React code instead of guessing.
- A single accuracy number isn't enough. The actual vs predicted chart shows that the model is good on typical houses and less reliable on the most expensive ones.

## What I'd do next

- Report the final score on a separate test set. Right now the "test" number on the dashboard comes from the validation data.
- Put the baseline models from notebook 03 on the error chart as well, so there's more than two bars.
- Tune the network and use cross-validation.
- Let the app switch between the neural network and XGBoost.
- Deploy it so there's a live link.

## Author

Syed Abdullah Shahid

GitHub: [MuhammadAbdullah-922](https://github.com/MuhammadAbdullah-922)
