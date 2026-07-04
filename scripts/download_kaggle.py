import kagglehub
import shutil
import os

print("Downloading dataset...")
path = kagglehub.dataset_download("shibin007/all-india-pincode-directory2025")
print("Downloaded to:", path)

# Find the file (usually a csv)
for filename in os.listdir(path):
    if filename.endswith(".csv") or filename.endswith(".xlsx"):
        src = os.path.join(path, filename)
        dest = os.path.join("d:/anti-swaste/public/mosaic", "all-india-pincode-2025" + os.path.splitext(filename)[1])
        shutil.copy(src, dest)
        print(f"Copied {filename} to {dest}")
