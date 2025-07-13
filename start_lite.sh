git pull
mv -f Dockerfile.lite Dockerfile
docker compose down && docker rmi my-custom-node-python-app && docker compose up --build -d