#!/usr/bin/env sh

if ! [ -z $emobility_server_type ] && ! [ -z $emobility_service_type ]
then
  [ -z $emobility_install_dir ] && { echo "emobility installation directory env variable not found, exiting"; exit 1; }
  [ -z $emobility_landscape ] && { echo "emobility landscape env variable not found, exiting"; exit 1; }
  [ -z $emobility_server_type ] && { echo "emobility env server type variable not found, exiting"; exit 1; }
  [ -z $emobility_service_type ] && { echo "emobility env service type variable not found, exiting"; exit 1; }
  [ ! -f $emobility_install_dir/dist/assets/configs-aws/$emobility_server_type-$emobility_service_type-$emobility_landscape.json ] && { echo "emobility conf dir not found, ignored"; exit 1; }

  cp $emobility_install_dir/dist/assets/configs-aws/$emobility_server_type-$emobility_service_type-$emobility_landscape.json $emobility_install_dir/dist/assets/config.json
  rm -rf $emobility_install_dir/dist/assets/configs-aws
else
  echo "no emobility env defined, start with default configuration"
fi
