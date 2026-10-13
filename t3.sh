V=4.96.3; B=https://api.ecoledirecte.com/v3
UA='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36'
read -p "identifiant: " ID; read -s -p "mot de passe: " PW; echo
J=./w_cj; rm -f $J; T=""; F=""; GTK=""
upd(){
  n=$(grep -i '^x-token:' "$1" | tail -1 | cut -d' ' -f2- | tr -d '\r'); [ -n "$n" ] && T="$n"
  f=$(grep -i '^2fa-token:' "$1" | tail -1 | cut -d' ' -f2- | tr -d '\r'); [ -n "$f" ] && F="$f"
}
hdr(){ H=(); [ -n "$T" ] && H+=(-H "X-Token: $T"); [ -n "$F" ] && H+=(-H "2FA-Token: $F"); [ "$1" = 1 ] && [ -n "$GTK" ] && H+=(-H "X-Gtk: $GTK"); }
gtk(){
  hdr 0
  curl -s -D ./w_hg -b $J -c $J -A "$UA" "${H[@]}" -o /dev/null "$B/login.awp?gtk=1&v=$V"
  GTK=$(grep -i '^set-cookie: *GTK=' ./w_hg | head -1 | sed -E 's/.*GTK=([^;]+).*/\1/' | tr -d '\r')
  upd ./w_hg
}
req(){
  hdr "$3"
  curl -s -D ./w_hd -b $J -c $J -A "$UA" "${H[@]}" --data-urlencode "data=$2" -o "$4" "$1"
  jt=$(jq -r '.token // empty' "$4" 2>/dev/null); [ -n "$jt" ] && T="$jt"
  upd ./w_hd
}
code(){ jq -r .code "$1" 2>/dev/null; }
gtk; [ -n "$GTK" ] && echo "1. GTK ok" || echo "1. GTK ABSENT"
D=$(jq -cn --arg i "$ID" --arg p "$PW" '{identifiant:$i,motdepasse:$p,isReLogin:false,uuid:"",fa:[]}')
req "$B/login.awp?v=$V" "$D" 1 ./w_l
echo "2. login code=$(code ./w_l) totp=$(jq -r '.data.totp // "n/a"' ./w_l) 2FA-Token recu: $([ -n "$F" ] && echo oui || echo non)"
if [ "$(code ./w_l)" = 250 ]; then
  [ "$(jq -r '.data.totp // false' ./w_l)" = true ] && { echo "Compte avec TOTP: pas gere"; rm -f ./w_*; exit 1; }
  req "$B/connexion/doubleauth.awp?verbe=get&v=$V" '{}' 0 ./w_q
  echo "3. question code=$(code ./w_q)"
  [ "$(code ./w_q)" = 200 ] || { jq -r .message ./w_q; rm -f ./w_*; exit 1; }
  jq -r '.data.question' ./w_q | base64 -d 2>/dev/null; echo
  i=0; while read -r p; do i=$((i+1)); echo "$i) $(echo "$p" | base64 -d 2>/dev/null)"; done < <(jq -r '.data.propositions[]' ./w_q)
  read -p "numero de ta reponse: " N
  RAW=$(jq -r ".data.propositions[$((N-1))]" ./w_q)
  req "$B/connexion/doubleauth.awp?verbe=post&v=$V" "$(jq -cn --arg c "$RAW" '{choix:$c}')" 0 ./w_a
  echo "4. reponse code=$(code ./w_a)"
  [ "$(code ./w_a)" = 200 ] || { jq -r .message ./w_a; rm -f ./w_*; exit 1; }
  CN=$(jq -r .data.cn ./w_a); CV=$(jq -r .data.cv ./w_a)
  gtk
  D=$(jq -cn --arg i "$ID" --arg p "$PW" --arg cn "$CN" --arg cv "$CV" '{identifiant:$i,motdepasse:$p,isReLogin:false,uuid:"",cn:$cn,cv:$cv,fa:[{cn:$cn,cv:$cv,uniq:false}]}')
  req "$B/login.awp?v=$V" "$D" 1 ./w_l
  echo "5. login final code=$(code ./w_l)"
fi
[ "$(code ./w_l)" = 200 ] || { jq -r .message ./w_l; rm -f ./w_*; exit 1; }
E=$(jq -r '.data.accounts[0].id' ./w_l)
echo "compte type=$(jq -r '.data.accounts[0].typeCompte' ./w_l)"
req "$B/eleves/$E/notes.awp?verbe=get&v=$V" '{"anneeScolaire":""}' 0 ./w_n
echo "NOTES code=$(code ./w_n) data=$(jq -c '.data|keys' ./w_n) nb=$(jq '.data.notes|length' ./w_n) periodes=$(jq '.data.periodes|length' ./w_n)"
echo " note: $(jq -c '(.data.notes[0] // {})|keys' ./w_n)"
echo " periode: $(jq -c '(.data.periodes[0] // {})|keys' ./w_n)"
req "$B/E/$E/emploidutemps.awp?verbe=get&v=$V" "{\"dateDebut\":\"$(date +%F)\",\"dateFin\":\"$(date -d '+6 days' +%F)\",\"avecTrous\":false}" 0 ./w_e
echo "EDT code=$(code ./w_e) nb=$(jq '.data|length' ./w_e) cours: $(jq -c '(.data[0] // {})|keys' ./w_e)"
req "$B/Eleves/$E/cahierdetexte.awp?verbe=get&v=$V" '{}' 0 ./w_d
echo "DEVOIRS code=$(code ./w_d) nb_dates=$(jq '.data|length' ./w_d) item: $(jq -c '(.data|to_entries[0].value[0] // {})|keys' ./w_d)"
DK=$(jq -r '.data|keys|.[0] // empty' ./w_d)
if [ -n "$DK" ]; then
  req "$B/Eleves/$E/cahierdetexte/$DK.awp?verbe=get&v=$V" '{}' 0 ./w_j
  echo " jour code=$(code ./w_j) matiere: $(jq -c '(.data.matieres[0] // {})|keys' ./w_j)"
  echo " aFaire: $(jq -c '(.data.matieres|map(select(.aFaire))[0].aFaire // {})|keys' ./w_j)"
fi
rm -f ./w_*
