# Our Code World custom implementation
# Read article at: 
# https://ourcodeworld.com/articles/read/981/how-to-implement-an-image-search-engine-using-keras-tensorflow-with-python-3-in-ubuntu-18-04
import os
import numpy as np
from PIL import Image
from feature_extractor import FeatureExtractor
import glob
import pickle
import json

if __name__=="__main__":
    fe = FeatureExtractor()
    features = []
    img_paths = []

    # Append every generated PKL file into an array and the image version as well
    for feature_path in glob.glob("static/feature/*"):
        features.append(pickle.load(open(feature_path, 'rb')))
        img_paths.append('static/img/' + os.path.splitext(os.path.basename(feature_path))[0] + '.jpg')

    # Define the query image, in our case it will be a hamburguer
    img = Image.open("/home/ourcodeworld/Desktop/hamburguer_query.jpg")  # PIL image

    # Search for matches
    query = fe.extract(img)
    dists = np.linalg.norm(features - query, axis=1)  # Do search
    ids = np.argsort(dists)[:30] # Top 30 results
    scores = [(dists[id], img_paths[id]) for id in ids]

    # Store results in a dictionary
    results = []

    for item in scores:
        results.append({
            "filename" : item[1],
            "uncertainty": str(item[0])
        })

    # Create a JSON file with the results
    with open('data.json', 'w') as outputfile:
        json.dump(results, outputfile, ensure_ascii=False, indent=4)