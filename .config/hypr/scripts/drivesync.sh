gdrive files upload --recursive --parent "1HBHWji3Rb9j5jzIgQNJABXm5-So0m9f4" "/home/some1/Documents/Python/sync/"
echo "Deleting old folder..."
old="$(gdrive files list --max 1 --parent 1HBHWji3Rb9j5jzIgQNJABXm5-So0m9f4 --order-by "modifiedTime" --skip-header | cut -d" " -f1 - )"
gdrive files delete --recursive $old