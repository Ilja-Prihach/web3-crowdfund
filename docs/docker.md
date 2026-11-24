# Локальный запуск в Docker

## Локальное демо с Anvil

Из корня репозитория запустите `bash docker/demo/up.sh`. После готовности откройте `http://localhost:3000` и выберите в окне подключения роль Demo Creator или Demo Backer. В демосети создаются пять кампаний с разными статусами и тематическими обложками. Транзакции подписывает локальный Anvil, средства тестовые. Начальные обложки добавляются в хранилище медиа при первом запуске и не перезаписывают сохранённые данные кампаний.

Для демо используется отдельный Compose-проект `openfund-demo` со своими томами PostgreSQL, обложек и состояния сети. При обычной остановке данные сохраняются. Если основной стек уже занимает порты, задайте `OPENFUND_HTTP_PORT` и `OPENFUND_POSTGRES_PORT` перед запуском. Остановить демо можно командой:

```sh
docker compose -p openfund-demo -f compose.yaml -f docker/demo/compose.yaml --profile stack down
```

Для сброса демоданных остановите этот проект командой выше с дополнительным флагом `-v`. При следующем запуске сеть и данные создаются заново. Подробности о томах и восстановлении обычного стека описаны ниже.

## Стек Sepolia

Из корня репозитория, при запущенном Docker Engine:

```sh
docker compose --profile stack up --build --wait
```

Сайт открывается на [localhost:3000](http://localhost:3000), API доступен через `/api` на том же адресе. Первый запуск скачивает образы, устанавливает зависимости по lock-файлам и собирает frontend. Индексатор догружает историю Sepolia в фоне. Пока история догружается, данные каталога могут быть неполными.

PostgreSQL сначала проходит проверку готовности по TCP. Контейнер `migrate` применяет миграции и завершается. Backend и indexer ждут его успешного завершения. Nginx запускается после готовности frontend и backend (`/ready`) и направляет `/api/*` в backend. У backend и indexer нет опубликованных портов. Для локальной разработки PostgreSQL доступен на `127.0.0.1:5433`, сайт публикуется на `127.0.0.1:3000`.

При необходимости скопируйте корневой `.env.example` в `.env`. `SEPOLIA_RPC_URL` передаётся только в окружение серверных контейнеров. В браузере используется публичный RPC frontend. `OPENFUND_HTTP_PORT` меняет порт и адрес для SIWE, `OPENFUND_POSTGRES_PORT` меняет внешний порт базы. Для входа используйте `localhost`, чтобы адрес совпал с настройкой SIWE. Пароль PostgreSQL в Compose предназначен только для локальной работы.

```sh
docker compose --profile stack ps -a
docker compose --profile stack logs migrate backend indexer
curl --fail http://localhost:3000/api/ready
docker compose --profile stack down
```

Обычный `down` сохраняет тома. Команда `docker compose up -d postgres` по-прежнему поднимает только базу для разработки и тестов.

## Бэкап и восстановление

База и обложки лежат в отдельных томах. Бэкап нужно запускать вручную, в том числе перед обновлением схемы. Выберите существующий каталог вне репозитория и храните копию в месте с ограниченным доступом.

```sh
bash docker/backup.sh /path/to/backups
```

Скрипт останавливает запущенный backend на время копирования базы и обложек, затем запускает его и ждёт готовности. Выполняйте бэкапы последовательно, вне ручного импорта обложек и миграций. Используйте каталоги с файлом `COMPLETE`. В них находятся `database.dump` и `media.tar.gz`. Индексатор пишет события и checkpoint транзакционно, а `pg_dump` читает согласованный снимок базы. Обложки, профили и другой пользовательский контент нельзя восстановить из блокчейна.

Восстанавливайте доверенную копию в **новый** Compose-проект с пустыми томами. Задайте другие порты, если исходный стек запущен. Подставьте абсолютный путь к завершённой копии:

```sh
export OPENFUND_HTTP_PORT=13000 OPENFUND_POSTGRES_PORT=15433
backup=/path/to/backups/openfund-...
test -f "$backup/COMPLETE"
docker compose -p openfund-restore --profile stack up -d --wait postgres
docker compose -p openfund-restore --profile stack exec -T postgres \
  pg_restore -U openfund -d openfund --exit-on-error --single-transaction < "$backup/database.dump"
docker compose -p openfund-restore --profile stack run --build --rm --no-deps -T backend \
  tar -xzf - -C /app/storage/media < "$backup/media.tar.gz"
docker compose -p openfund-restore --profile stack up --build --wait
```

Восстанавливайте базу и обложки из одного каталога. Если какой-либо шаг вернул ошибку, остановитесь до запуска приложения и проверьте причину.
