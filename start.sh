git pull
if command -v podman >/dev/null 2>&1; then
	podman compose down
	podman rmi my-custom-node-python-app
	podman compose up --build -d
else
	docker compose down
	docker rmi my-custom-node-python-app
	docker compose up --build -d
fi
