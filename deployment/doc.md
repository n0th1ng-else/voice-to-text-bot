# Deploying the service

More in the article https://www.geeksforgeeks.org/blue-green-deployments-with-docker-swarm/

1. Login via ssh, copy and execute `./scripts/prepare-env.sh` script
2. Copy `./configs/docker-compose-bluegreen.yml` in the folder the script has created
3. Copy `./scripts/update-services.sh` in the folder the script has created
4. Copy `./scripts/deploy-app.sh` in the folder the script has created
5. Create empty environment file `app.env` in the folder the script has created
6. Deploy the initial stack `sudo docker stack deploy -c docker-compose-bluegreen.yml -d --with-registry-auth voice-to-text-app`
7. Check the service status `sudo docker service ls`
8. Check the container status `sudo docker ps`
9. Create nginx config
   - `cd /etc/nginx/sites-available`
   - `sudo nano bot`
   - Copy the content from `./configs/bot.nginx`
   - `sudo ln -sf /etc/nginx/sites-available/* /etc/nginx/sites-enabled/`
   - Reload nginx `sudo systemctl reload nginx && sudo service nginx restart`
