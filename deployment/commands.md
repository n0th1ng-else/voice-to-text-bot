##### Check nginx status

```bash
sudo systemctl status nginx
```

##### Deploy for the first time

```bash
sudo docker stack deploy -c docker-compose-bluegreen.yml -d --with-registry-auth voice-to-text-app
```

##### Check services status

```bash
sudo docker service ls
```

##### Check containers status

```bash
sudo docker ps
```

##### Manual service stop

sudo docker service scale <stack*name>*<service_name>=0

```bash
sudo docker service scale voice-to-text-app_bot_green=0
```
