#!/bin/bash

read -p "What is your name?: " name 
echo
read -p "What is your surname?: " surname
echo
read -p "What access code would you like to use when dialing in?(must be exact 4 digits): " code
echo


echo "$name,$surname,$code" >> extensions.csv
