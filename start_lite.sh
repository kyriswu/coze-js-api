git pull
mv -f Dockerfile.lite Dockerfile
docker compose down && docker rmi my-custom-node-python-app && rm -rf images/* && docker compose up --build -d