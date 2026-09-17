# Government deployment examples

هذه الملفات أمثلة تسليم لمهندس البنية التحتية وليست قيمًا نهائية:

- `nginx-government.conf.example`: Reverse proxy + TLS + حد لمحاولات تسجيل الدخول.
- `medical-liability.service.example`: systemd sandbox بحساب خدمة غير root.
- المتطلبات الكاملة: `docs/GOVERNMENT_SERVER_REQUIREMENTS.md`.

## مجلدات مقترحة

```text
/opt/medical-liability/current        application release
/etc/medical-liability/app.env       production secrets/config (0600)
/srv/medical-liability/uploads       persistent documents (0750)
```

مثال:

```bash
sudo install -d -o medical-liability -g medical-liability -m 0750 /srv/medical-liability/uploads
sudo install -d -o root -g medical-liability -m 0750 /etc/medical-liability
sudo chmod 0600 /etc/medical-liability/app.env
```

لا يتم وضع `UPLOAD_ROOT` تحت `public/` أو أي alias في Nginx.
