ENV_TEMPLATE=".env.example"
ENV_LOCAL=".env.local"
ENV_TARGET=".env"

sync_env_file() {
	if [ ! -f "$ENV_TEMPLATE" ]; then
		echo "缺少 $ENV_TEMPLATE，无法生成 $ENV_TARGET"
		exit 1
	fi

	cp "$ENV_TEMPLATE" "$ENV_TARGET.tmp"

	if [ -f "$ENV_LOCAL" ]; then
		while IFS= read -r raw_line || [ -n "$raw_line" ]; do
			line=$(printf '%s' "$raw_line" | tr -d '\r')
			case "$line" in
				''|\#*)
					continue
					;;
			esac

			key=${line%%=*}
			if grep -q "^${key}=" "$ENV_TARGET.tmp"; then
				awk -v key="$key" -v replacement="$line" '
					BEGIN { replaced = 0 }
					index($0, key "=") == 1 && replaced == 0 {
						print replacement
						replaced = 1
						next
					}
					{ print }
				' "$ENV_TARGET.tmp" > "$ENV_TARGET.tmp.next"
				mv "$ENV_TARGET.tmp.next" "$ENV_TARGET.tmp"
			else
				printf '\n%s\n' "$line" >> "$ENV_TARGET.tmp"
			fi
		done < "$ENV_LOCAL"
	fi

	mv "$ENV_TARGET.tmp" "$ENV_TARGET"
	if [ -f "$ENV_LOCAL" ]; then
		echo "已同步 $ENV_TARGET（来源：$ENV_TEMPLATE + $ENV_LOCAL）"
	else
		echo "已同步 $ENV_TARGET（来源：$ENV_TEMPLATE）"
	fi

	if ! grep -Eq '^EVOLINK_API_KEY=.+' "$ENV_TARGET"; then
		echo "警告：$ENV_TARGET 中未检测到 EVOLINK_API_KEY，Evolink 接口将不可用"
	fi
}

bootstrap_env_file() {
	if [ -f "$ENV_TARGET" ]; then
		return
	fi

	if [ -f "$ENV_TEMPLATE" ]; then
		cp "$ENV_TEMPLATE" "$ENV_TARGET"
		echo "已初始化 $ENV_TARGET（来源：$ENV_TEMPLATE）"
	else
		: > "$ENV_TARGET"
		echo "已创建空的 $ENV_TARGET"
	fi
}

bootstrap_env_file
git pull

if [ "${START_SH_REEXEC:-0}" != "1" ]; then
	exec env START_SH_REEXEC=1 bash "$0" "$@"
fi

sync_env_file
if command -v podman >/dev/null 2>&1; then
	podman compose down
	podman rmi my-custom-node-python-app
	podman compose up --build -d
else
	docker compose down
	docker rmi my-custom-node-python-app
	docker compose up --build -d
fi
