#!/bin/bash

#### STEP 1 ####

# Define the folder name
FOLDER_NAME="vtt-application"
SERVICE_CACHE_FOLDER_NAME="vtt-cache"

# Check if the project folder exists
if [ ! -d "./$FOLDER_NAME" ]; then
  # If the folder does not exist, create it
  mkdir "./$FOLDER_NAME"
  echo "Folder '$FOLDER_NAME' created."
else
  # If the folder exists, print a message
  echo "Folder '$FOLDER_NAME' already exists."
fi

cd "./$FOLDER_NAME"

# Check if the cache folder exists
if [ ! -d "./$SERVICE_CACHE_FOLDER_NAME" ]; then
  # If the folder does not exist, create it
  mkdir "./$SERVICE_CACHE_FOLDER_NAME"
  echo "Folder '$FOLDER_NAME/$SERVICE_CACHE_FOLDER_NAME' created."
else
  # If the folder exists, print a message
  echo "Folder '$FOLDER_NAME/$SERVICE_CACHE_FOLDER_NAME' already exists."
fi

#### STEP 2 ####

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
  echo "Docker is not installed. Installing Docker..."

  # Update the package list
  sudo apt-get update

  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh get-docker.sh
  sudo apt-get install docker-compose-plugin

  # Start Docker service
  sudo systemctl start docker

  # Enable Docker to start on boot
  sudo systemctl enable docker

  echo "Docker installed successfully."
else
  echo "Docker is already installed."
fi

#### STEP 3 ####

# Initialize Docker Swarm
if ! docker info | grep -q "Swarm: active"; then
  echo "Initializing Docker Swarm..."
  sudo docker swarm init
  echo "Docker Swarm initialized."
else
  echo "Docker Swarm is already initialized."
fi

#### STEP 4 ####

# Check if Nginx is installed
if ! command -v nginx &> /dev/null; then
  echo "Nginx is not installed. Installing Nginx..."
  # Update the package list
  sudo apt-get update

  # Install Nginx
  sudo apt-get install -y nginx
  sudo systemctl start nginx
  sudo systemctl enable nginx

  echo "Nginx installed successfully."
else
  echo "Nginx is already installed."
fi

# Check if Certbot is installed
if ! command -v certbot &> /dev/null; then
  echo "Installing Certbot..."
  sudo snap install --classic certbot
  sudo ln -s /snap/bin/certbot /usr/bin/certbot
else
  echo "Certbot is already installed."
fi

#### STEP 5 ####

echo "Now you need to apply the nginx config manually and reload the nginx:"
echo "Change the configuration for /etc/nginx/sites-available/default"
echo "- sudo systemctl reload nginx"

