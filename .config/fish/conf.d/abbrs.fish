
abbr -a stow-dotfiles "stow -S --ignore README.md --ignore .wakatime-proj --ignore usr --ignore etc ."

abbr -a update-mirrors "run0 ghostmirror -Po -mu /etc/pacman.d/mirrorlist -l /etc/pacman.d/mirrorlist -s light -S state,outofdate,morerecent,estimated,speed"
