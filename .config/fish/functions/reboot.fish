function reboot --description 'alias reboot=systemctl reboot'
    systemctl reboot $argv
end
