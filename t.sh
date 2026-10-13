V=4.75.0; B=https://api.ecoledirecte.com/v3
UA='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36'
read -p "identifiant: " ID; read -s -p "mot de passe: " PW; echo
J=./w_cj; rm -f $J
curl -s -D ./w_h1 -c $J -A "$UA" -o /dev/null "$B/login.awp?gtk=1&v=$V"
GTK=$(grep -i '^set-cookie: *GTK=' ./w_h1 | head -1 | sed -E 's/.*GTK=([^;]+).*/\1/' | tr -d '\r')
[ -n "$GTK" ] && echo "1. GTK: ok" || echo "1. GTK: ABSENT"
D=$(jq -cn --arg i "$ID" --arg p "$PW" '{identifiant:$i,motdepasse:$p,isReLogin:false,uuid:"",fa:[]}')
curl -s -D ./w_h2 -b $J -c $J -A "$UA" -H "X-Gtk: $GTK" --data-urlencode "data=$D" -o ./w_b2 "$B/login.awp?v=$V"
echo "2. login: code=$(jq -r .code ./w_b2) msg=$(jq -r .message ./w_b2)"
HT=$(grep -i '^x-token:' ./w_h2 | head -1 | cut -d' ' -f2 | tr -d '\r')
JT=$(jq -r '.token // empty' ./w_b2)
[ -n "$HT" ] && echo "   token en header: oui" || echo "   token en header: non"
[ -n "$JT" ] && echo "   token en json: oui" || echo "   token en json: non"
[ "$HT" = "$JT" ] && echo "   memes tokens: oui" || echo "   memes tokens: non"
echo "   GTK renvoye par le login: $(grep -ci '^set-cookie: *GTK' ./w_h2)"
G2=$(awk '$6=="GTK"{print $7}' $J)
[ "$G2" = "$GTK" ] && echo "   GTK inchange: oui" || echo "   GTK inchange: non"
T=${JT:-$HT}
t() { echo "$1: code=$(jq -r .code ./w_o 2>&1) msg=$(jq -r .message ./w_o 2>&1)"; }
curl -s -b $J -c $J -A "$UA" -H "X-Gtk: $GTK" -H "X-Token: $T" --data-urlencode 'data={}' -o ./w_o "$B/connexion/doubleauth.awp?verbe=get&v=$V"; t "3A POST"
curl -s -b $J -c $J -A "$UA" -H "X-Gtk: $G2" -H "X-Token: $T" --data-urlencode 'data={}' -o ./w_o "$B/connexion/doubleauth.awp?verbe=get&v=$V"; t "3B POST gtk maj"
curl -s -b $J -c $J -A "$UA" -H "X-Gtk: $G2" -H "X-Token: $T" -o ./w_o "$B/connexion/doubleauth.awp?verbe=get&v=$V"; t "3C GET"
