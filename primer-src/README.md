# primer-src

`docs/index.html`(GitHub Pages로 배포되는 primer)의 진짜 원본이다. `docs/index.html`
자체는 빌드 결과물이니 직접 고치지 말고 여기를 고친 뒤 다시 빌드한다.

## 빌드

```bash
cd primer-src
perl build.pl
```

`template.html`을 읽어 `__IMG_*__` 자리표시자를 `../enode-dashboard/screenshots/`의
스크린샷으로(base64 data URI) 채우고 `../docs/index.html`에 쓴다. 표준
라이브러리(`MIME::Base64`)만 쓰므로 Perl만 있으면 된다.

## 새 스크린샷을 추가하려면

1. `enode-dashboard/screenshots/`에 파일을 넣는다
2. `build.pl`의 `%mapping`에 `__IMG_새이름__` 자리표시자와 파일명을 추가한다
3. `template.html`에서 그 자리표시자를 쓴다
4. `perl build.pl`로 다시 빌드하고 `docs/index.html` 변경분을 커밋한다
