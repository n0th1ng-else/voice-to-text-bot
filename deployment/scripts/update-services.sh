#!/bin/bash

# This function will fetch all current env values used by inactive service
get_current_env() {
  SERVICE_NAME=$1
  sudo docker service inspect --format '{{range .Spec.TaskTemplate.ContainerSpec.Env}}{{println .}}{{end}}' $SERVICE_NAME
}

# This function will read env file line by line and store the output which will be used later for updating env values in services
load_env_file() {
  ENV_FILE=$1
  NEW_ENV_VARS=""  # Initialize an empty string to accumulate all environment additions
  while IFS= read -r LINE; do
    if [[ -n "$LINE" && "$LINE" != \#* ]]; then  # Check if the line is not empty and not a comment
      KEY=$(echo "$LINE" | cut -d'=' -f1)
      VALUE=$(echo "$LINE" | cut -d'=' -f2-)
      NEW_ENV_VARS+="--env-add $KEY=\"$VALUE\" "  # Append to the string with quoted value
    fi
  done < "$ENV_FILE"
  echo "$NEW_ENV_VARS"  # Print all additions in one line without a newline at the end
}

# This function will compare existing and new env variables and will store the environment variables that are no longer needed as an output,
 which will be used later in service update command
get_env_vars_to_remove() {
  CURRENT_ENV_VARS="$1"
  NEW_ENV_VARS="$2"
  ENV_VARS_TO_REMOVE=""  # Initialize an empty string to accumulate all environment removals

  # Convert string of current env vars into an array
  IFS=$'\n' read -r -d '' -a current_env_array <<< "$CURRENT_ENV_VARS"

  # Loop through each variable in the current environment
  for VAR in "${current_env_array[@]}"; do
    # Check if the current env variable is not in the new env variables
    if ! grep -qF -- "$VAR" <<< "$NEW_ENV_VARS"; then
      KEY=$(echo "$VAR" | cut -d'=' -f1)  # Extract the key part of the environment variable
      ENV_VARS_TO_REMOVE+="--env-rm $KEY "  # Append to the string
    fi
  done
  echo "$ENV_VARS_TO_REMOVE"  # Print all removals in one line without a newline at the end
}

# This function updates the service with new docker image, adds new env variables and removes the unnecessary env variables
update_service () {
  STACK_NAME=$1
  SERVICE_NAME=$2
  NEW_IMAGE=$3
  ENV_FILE=$4

  BLUE_REPLICAS=$(sudo docker service ls --filter name=${STACK_NAME}_${SERVICE_NAME}_blue --format "{{.Replicas}}" | awk -F '/' '{print $1}')
  GREEN_REPLICAS=$(sudo docker service ls --filter name=${STACK_NAME}_${SERVICE_NAME}_green --format "{{.Replicas}}" | awk -F '/' '{print $1}')

  NEW_ENV_VARS=$(load_env_file $ENV_FILE)

  if [ $BLUE_REPLICAS -gt 0 ]; then
    echo "Currently Blue Version Is Active With Replicas-$BLUE_REPLICAS For Service-$SERVICE_NAME"
    echo "Updating Green Version For Service-$SERVICE_NAME With Latest Docker Image and Environment Variables"
    CURRENT_ENV_VARS=$(get_current_env ${STACK_NAME}_${SERVICE_NAME}_green)
    ENV_VARS_TO_REMOVE=$(get_env_vars_to_remove "$CURRENT_ENV_VARS" "$NEW_ENV_VARS")
    cmd="sudo docker service update --with-registry-auth --force --image"
    cmd="$cmd $NEW_IMAGE"
    cmd="$cmd $NEW_ENV_VARS"
    cmd="$cmd $ENV_VARS_TO_REMOVE"
    cmd="$cmd ${STACK_NAME}_${SERVICE_NAME}_green"
    eval $cmd
    echo "This is the updated image name- $NEW_IMAGE"
    echo "Printing Updated Image Which Will Be Used By The New Green Version For Service-$SERVICE_NAME"
    sudo docker service inspect --format '{{.Spec.TaskTemplate.ContainerSpec.Image}}' ${STACK_NAME}_${SERVICE_NAME}_green

  elif [ $GREEN_REPLICAS -gt 0 ]; then
    echo "Currently Green Version Is Active With Replicas-$GREEN_REPLICAS For Service-$SERVICE_NAME"
    echo "Updating Blue Version For Service-$SERVICE_NAME With Latest Docker Image"
    CURRENT_ENV_VARS=$(get_current_env ${STACK_NAME}_${SERVICE_NAME}_blue)
    ENV_VARS_TO_REMOVE=$(get_env_vars_to_remove "$CURRENT_ENV_VARS" "$NEW_ENV_VARS")
    cmd="sudo docker service update --with-registry-auth --force --image"
    cmd="$cmd $NEW_IMAGE"
    cmd="$cmd $NEW_ENV_VARS"
    cmd="$cmd $ENV_VARS_TO_REMOVE"
    cmd="$cmd ${STACK_NAME}_${SERVICE_NAME}_blue"
    eval $cmd
    echo "This is the updated image name- $NEW_IMAGE"
    echo "Printing Updated Image Which Will Be Used By The Blue Version For Service-$SERVICE_NAME"
    sudo docker service inspect --format '{{.Spec.TaskTemplate.ContainerSpec.Image}}' ${STACK_NAME}_${SERVICE_NAME}_blue

  else
    echo "Couldn't Find Any Active Replica For The Service-$SERVICE_NAME"
    exit 1
  fi
}