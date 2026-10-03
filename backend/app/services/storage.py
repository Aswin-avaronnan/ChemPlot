import os
import shutil
from typing import Optional
from app.core.config import settings

class StorageService:
    def __init__(self):
        self.use_r2 = bool(settings.R2_BUCKET and settings.R2_ACCESS_KEY_ID and settings.R2_SECRET_ACCESS_KEY)
        self.local_dir = settings.LOCAL_STORAGE_DIR
        os.makedirs(self.local_dir, exist_ok=True)
        self._s3_client = None
        
    @property
    def s3_client(self):
        if self._s3_client is None and self.use_r2:
            import boto3
            from botocore.config import Config
            endpoint_url = f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
            self._s3_client = boto3.client(
                "s3",
                endpoint_url=endpoint_url,
                aws_access_key_id=settings.R2_ACCESS_KEY_ID,
                aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
                config=Config(signature_version="s3v4"),
                region_name="auto"
            )
        return self._s3_client

    def save_file(self, content_bytes: bytes, key: str) -> str:
        # Always write to local storage as fast primary / cache
        local_path = os.path.join(self.local_dir, key)
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        with open(local_path, "wb") as f:
            f.write(content_bytes)
            
        if self.use_r2:
            try:
                self.s3_client.put_object(
                    Bucket=settings.R2_BUCKET,
                    Key=key,
                    Body=content_bytes,
                )
            except Exception as e:
                # Log warning, but local copy is already saved
                print(f"Warning: R2 upload failed for {key}: {e}")
                
        return local_path

    def get_file_path(self, key: str) -> str:
        local_path = os.path.join(self.local_dir, key)
        if os.path.exists(local_path):
            return local_path
            
        if self.use_r2:
            os.makedirs(os.path.dirname(local_path), exist_ok=True)
            self.s3_client.download_file(settings.R2_BUCKET, key, local_path)
            return local_path
            
        raise FileNotFoundError(f"File key {key} not found in storage")

storage_service = StorageService()
