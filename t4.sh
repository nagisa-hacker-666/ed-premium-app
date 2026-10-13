V=4.96.3; B=https://api.ecoledirecte.com/v3
UA='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36'
TF=$HOME/.ed_trusted
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
K(){ jq -c "$1" "$2" 2>/dev/null; }
mk(){ jq -cn --arg i "$ID" --arg p "$PW" --arg cn "$1" --arg cv "$2" 'if $cn=="" then {identifiant:$i,motdepasse:$p,isReLogin:false,uuid:"",fa:[]} else {identifiant:$i,motdepasse:$p,isReLogin:false,uuid:"",cn:$cn,cv:$cv,fa:[{cn:$cn,cv:$cv,uniq:false}]} end'; }
CN=""; CV=""; [ -f $TF ] && { CN=$(jq -r .cn $TF); CV=$(jq -r .cv $TF); }
gtk
req "$B/login.awp?v=$V" "$(mk "$CN" "$CV")" 1 ./w_l
if [ "$(code ./w_l)" = 250 ]; then
  req "$B/connexion/doubleauth.awp?verbe=get&v=$V" '{}' 0 ./w_q
  [ "$(code ./w_q)" = 200 ] || { echo "echec question"; rm -f ./w_*; exit 1; }
  jq -r '.data.question' ./w_q | base64 -d 2>/dev/null; echo
  i=0; while read -r p; do i=$((i+1)); echo "$i) $(echo "$p" | base64 -d 2>/dev/null)"; done < <(jq -r '.data.propositions[]' ./w_q)
  read -p "numero de ta reponse: " N
  RAW=$(jq -r ".data.propositions[$((N-1))]" ./w_q)
  req "$B/connexion/doubleauth.awp?verbe=post&v=$V" "$(jq -cn --arg c "$RAW" '{choix:$c}')" 0 ./w_a
  [ "$(code ./w_a)" = 200 ] || { jq -r .message ./w_a; rm -f ./w_*; exit 1; }
  CN=$(jq -r .data.cn ./w_a); CV=$(jq -r .data.cv ./w_a)
  gtk
  req "$B/login.awp?v=$V" "$(mk "$CN" "$CV")" 1 ./w_l
  [ "$(code ./w_l)" = 200 ] && jq -cn --arg cn "$CN" --arg cv "$CV" '{cn:$cn,cv:$cv}' > $TF
fi
[ "$(code ./w_l)" = 200 ] || { jq -r .message ./w_l; rm -f ./w_*; exit 1; }
E=$(jq -r '.data.accounts[0].id' ./w_l)
echo "login ok. modules actifs: $(K '[.data.accounts[0].modules[]?|select(.enable)|.code]' ./w_l)"
Y=$(date +%Y); M=$((10#$(date +%m))); [ $M -ge 8 ] && AN="$Y-$((Y+1))" || AN="$((Y-1))-$Y"
req "$B/eleves/$E/messages.awp?verbe=getall&typeRecuperation=received&orderBy=date&order=desc&page=0&itemsPerPage=100&onlyRead=&query=&idClasseur=0&v=$V" "{\"anneeMessages\":\"$AN\"}" 0 ./w_m
echo "MESSAGES code=$(code ./w_m) data=$(K '.data|keys' ./w_m) messages=$(K '.data.messages|keys' ./w_m) recus=$(K '.data.messages.received|length' ./w_m)"
echo " msg: $(K '(.data.messages.received[0] // {})|keys' ./w_m)"
echo " from: $(K '(.data.messages.received[0].from // {})|keys' ./w_m)"
MID=$(jq -r '.data.messages.received[0].id // empty' ./w_m 2>/dev/null)
if [ -n "$MID" ]; then
  req "$B/eleves/$E/messages/$MID.awp?verbe=get&mode=destinataire&v=$V" "{\"anneeMessages\":\"$AN\"}" 0 ./w_mm
  echo " lecture code=$(code ./w_mm) cles: $(K '.data|keys' ./w_mm)"
fi
req "$B/eleves/$E/viescolaire.awp?verbe=get&v=$V" '{}' 0 ./w_v
echo "VIESCO code=$(code ./w_v) data=$(K '.data|keys' ./w_v) absRet=$(K '.data.absencesRetards|length' ./w_v) sanctions=$(K '.data.sanctionsEncouragements|length' ./w_v)"
echo " absence: $(K '(.data.absencesRetards[0] // {})|keys' ./w_v)"
echo " types: $(K '[.data.absencesRetards[]?.typeElement]|unique' ./w_v)"
echo " sanction: $(K '(.data.sanctionsEncouragements[0] // {})|keys' ./w_v)"
req "$B/eleves/$E/timeline.awp?verbe=get&v=$V" '{}' 0 ./w_t
echo "TIMELINE code=$(code ./w_t) nb=$(K '.data|length' ./w_t) item: $(K '(.data[0] // {})|keys' ./w_t)"
req "$B/familledocuments.awp?verbe=get&v=$V" '{"anneeScolaire":""}' 0 ./w_f
echo "DOCS code=$(code ./w_f) data=$(K '.data|keys' ./w_f)"
rm -f ./w_*
