from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
import random
from typing import Optional
import uvicorn

app = FastAPI()

# Allow CORS for all origins (adjust as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def calculate_clarity(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    variance = cv2.Laplacian(gray, cv2.CV_64F).var()
    clarity_score = min(max(variance / 1000.0 * 100, 0), 100)
    return clarity_score

def calculate_lighting(image):
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    brightness = hsv[:, :, 2].mean()
    lighting_score = min(max(brightness / 255.0 * 100, 0), 100)
    return lighting_score

def calculate_vibrancy(image):
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    saturation = hsv[:, :, 1]
    vibrancy_score = min(max(np.std(saturation) / 128.0 * 100, 0), 100)
    return vibrancy_score

def calculate_creativity():
    # Randomized heuristic for creativity
    return random.uniform(50, 100)

@app.post("/score")
async def score_image(file: Optional[UploadFile] = File(None), image_url: Optional[str] = Form(None)):
    if file:
        contents = await file.read()
        np_arr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    elif image_url:
        import requests
        response = requests.get(image_url)
        np_arr = np.frombuffer(response.content, np.uint8)
        image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    else:
        return JSONResponse(status_code=400, content={"error": "Either file or image_url is required"})

    if image is None:
        return JSONResponse(status_code=400, content={"error": "Invalid image"})

    clarity = calculate_clarity(image)
    lighting = calculate_lighting(image)
    vibrancy = calculate_vibrancy(image)
    creativity = calculate_creativity()

    total_score = (clarity + lighting + vibrancy + creativity) / 4

    return {
        "totalScore": round(total_score, 2),
        "breakdown": {
            "clarity": round(clarity, 2),
            "lighting": round(lighting, 2),
            "vibrancy": round(vibrancy, 2),
            "creativity": round(creativity, 2)
        }
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
