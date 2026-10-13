V=4.75.0; B=https://api.ecoledirecte.com/v3
UA='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36'
read -p "identifiant: " ID; read -s -p "mot de passe: " PW; echo
J=./w_cj; rm -f $J
curl -s -D ./w_h1 -c $J -A "$UA" -o /dev/null "$B/login.awp?gtk=1&v=$V"
GTK=$(grep -i '^set-cookie: *GTK=' ./w_h1 | head -1 | sed -E 's/.*GTK=([^;]+).*/\1/' | tr -d '\r')
D=$(jq -cn --arg i "$ID" --arg p "$PW" '{identifiant:$i,motdepasse:$p,isReLogin:false,uuid:"",fa:[]}')
curl -s -D ./w_h2 -b $J -c $J -A "$UA" -H "X-Gtk: $GTK" --data-urlencode "data=$D" -o ./w_b2 "$B/login.awp?v=$V"
T=$(jq -r '.token // empty' ./w_b2)
G2=$(grep -i '^set-cookie: *GTK=' ./w_h2 | head -1 | sed -E 's/.*GTK=([^;]+).*/\1/' | tr -d '\r')
G=${G2:-$GTK}
echo "login code=$(jq -r .code ./w_b2) gtk1=${#GTK} gtk2=${#G2} token=${#T}"
c() { l="$1"; shift; curl -s -b $J -A "$UA" -o ./w_o "$@"; echo "$l -> $(jq -r '"code=\(.code) \(.message // "ok")"' ./w_o 2>/dev/null || head -c 80 ./w_o)"; }
U="$B/connexion/doubleauth.awp?verbe=get&v=$V"
c "1 POST std" -H "X-Gtk: $G" -H "X-Token: $T" --data-urlencode 'data={}' "$U"
c "2 POST ancien gtk" -H "X-Gtk: $GTK" -H "X-Token: $T" --data-urlencode 'data={}' "$U"
c "3 POST sans gtk" -H "X-Token: $T" --data-urlencode 'data={}' "$U"
c "4 POST token dans data" -H "X-Gtk: $G" -H "X-Token: $T" --data-urlencode "data={\"token\":\"$T\"}" "$U"
c "5 POST token data seul" -H "X-Gtk: $G" --data-urlencode "data={\"token\":\"$T\"}" "$U"
c "6 GET" -H "X-Gtk: $G" -H "X-Token: $T" "$U"
c "7 GET + data" -G -H "X-Gtk: $G" -H "X-Token: $T" --data-urlencode 'data={}' "$U"
c "8 GET sans verbe" -H "X-Gtk: $G" -H "X-Token: $T" "$B/connexion/doubleauth.awp?v=$V"
c "9 POST sans verbe" -H "X-Gtk: $G" -H "X-Token: $T" --data-urlencode 'data={}' "$B/connexion/doubleauth.awp?v=$V"
