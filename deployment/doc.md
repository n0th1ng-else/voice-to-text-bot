# Deploying the service

More in the article https://www.geeksforgeeks.org/blue-green-deployments-with-docker-swarm/

1. Login via ssh, copy and execute `./scripts/prepare-env.sh` script
2. Copy `./configs/docker-compose-bluegreen.yml` in the folder the script has created
3. Copy `./scripts/update-services.sh` in the folder the script has created
4. Copy `./scripts/deploy-app.sh` in the folder the script has created
5. Create empty environment file `app.env` in the folder the script has created
   - Copy required env parameters there
6. Deploy the initial stack `sudo docker stack deploy -c docker-compose-bluegreen.yml -d --with-registry-auth voice-to-text-app`
   - Use the same command if you change anything in the env file or docker compose
7. Check the service status `sudo docker service ls`
8. Check the container status `sudo docker ps`
9. Create nginx config
   - `cd /etc/nginx/sites-available`
   - `sudo nano bot`
   - Copy the content from `./configs/bot.nginx`
   - `sudo ln -sf /etc/nginx/sites-available/* /etc/nginx/sites-enabled/`
   - Reload nginx `sudo systemctl reload nginx && sudo service nginx restart`
10. Open the ports
    - Add the rules in the `sudo nano /etc/iptables/rules.v4` after SSH rule (port 22)
    - `-A INPUT -p tcp -m state --state NEW -m tcp --dport 80 -j ACCEPT`
    - `-A INPUT -p tcp -m state --state NEW -m tcp --dport 443 -j ACCEPT`
    - Apply rules `sudo iptables-restore < /etc/iptables/rules.v4`
    - Check the rules applied `sudo iptables -L INPUT`
    - Do same in OCI console: `Virtual cloud network > subnets > security lists > ingress rules`
    - `0.0.0.0/0, All ports to 443` # Try port 80 first and see the NGINX home page
