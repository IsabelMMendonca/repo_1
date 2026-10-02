#!/bin/bash

sum=$1

#${parameter:-word}
#echo $(( ${2:-0} $1 ${3:-0} ${3:-0}  ${3:-0} .... ))    
# ${3:-0} -> use $3. if missing or empty, use 0 instead

operation=""
#shift
shift

for number in "$@"
do
  if(( i % 2 == 0 )); then 
     echo "operation ${operation}"
     operation=$number	
  else
  echo "number ${number}" 
  ((sum = sum ${operation} ${number} ))
  
 fi
 ((i+=1))
done



echo ${sum}	
