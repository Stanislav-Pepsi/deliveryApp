@AGENTS.md

# Сборка и установка APK

## Правило: всегда собирать release, не debug

Debug APK требует подключения к Metro и выдаёт ошибки devtools. Всегда используем `assembleRelease`.

## Команды для сборки

```bash
# 1. Остановить Gradle daemon если завис
cd android && ./gradlew --stop

# 2. Собрать release APK (JS бандлится автоматически)
./gradlew app:assembleRelease -x lint -x test

# 3. Установить на устройство
"$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe" install -r android/app/build/outputs/apk/release/app-release.apk
```

## Путь к ADB

ADB находится по адресу: `C:\Users\PC\AppData\Local\Android\Sdk\platform-tools\adb.exe`

Команды ADB запускать через Bash tool (не PowerShell):
```bash
"c:/Users/PC/AppData/Local/Android/Sdk/platform-tools/adb.exe" devices
"c:/Users/PC/AppData/Local/Android/Sdk/platform-tools/adb.exe" install -r <путь к apk>
```

## Если android папка сломалась — пересоздать

```bash
# Убить все Java процессы (снимает блокировку папки)
# В PowerShell: Get-Process -Name "java" | Stop-Process -Force

# Пересоздать android папку
npx expo prebuild --platform android --clean

# Восстановить local.properties
echo "sdk.dir=C\:\\Users\\PC\\AppData\\Local\\Android\\Sdk" > android/local.properties

# Вернуть maven репозиторий для notifee в android/build.gradle (в блок allprojects > repositories):
# maven { url "$rootDir/../node_modules/@notifee/react-native/android/libs" }
```

## Подключение устройства (беспроводная отладка Android 11+)

1. На телефоне: Настройки → Беспроводная отладка → "Подключение через код"
2. Спарить: `adb pair <IP>:<port>` → ввести 6-значный код
3. Подключиться к основному порту: `adb connect <IP>:<основной_порт>`
4. Проверить: `adb devices`

## Важно

- Signing: release APK подписывается debug-ключом (`android/app/debug.keystore`) — это нормально для разработки
- После `expo prebuild --clean` всегда проверять что `local.properties` и maven notifee на месте
- `bundleInDebug=true` в gradle.properties не работает в RN 0.81+
