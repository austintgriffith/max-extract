#/bin/bash
sudo certbot certonly --standalone -d backend.extract.fi --config-dir ~/.certbot/config --logs-dir ~/.certbot/logs --work-dir ~/.certbot/work

#if you run it without the dirs, it will be in /etc/letsencrypt/live/rpc.eth.build

sudo cp -f ~/.certbot/config/live/backend.extract.fi/privkey.pem server.key;sudo chmod 0777 server.key
sudo cp -f ~/.certbot/config/live/backend.extract.fi/fullchain.pem server.cert;sudo chmod 0777 server.cert