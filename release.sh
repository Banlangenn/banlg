git checkout master
git merge dev

#!/usr/bin/env sh
set -e
echo "Enter release version: "
read VERSION

read -p "Releasing $VERSION - are you sure? (y/n)" -n 1 -r
echo    # (optional) move to a new line
if [[ $REPLY =~ ^[Yy]$ ]]
then
  echo "Releasing $VERSION ..."




  # commit
  git add -A
  git commit -m "[Release] $VERSION"


  # publish
  git push 
  git checkout dev

  if [[ $VERSION =~ "beta" ]]
  then
    npm publish --tag beta
  else
    npm version patch
    npm publish
  fi
fi


