ssh -L 6443:localhost:6443 \
    -L 7474:10.108.100.188:7474 \
    -L 7687:10.108.100.188:7687 \
    -L 7473:10.108.100.188:7473 \
    -L 3001:10.98.114.210:3001 \
    -L 5433:10.97.62.163:5432 \
    blacksabbath.inf.ufrgs.br
echo "Forwarding ports 7474 (browser interface), 7687 (bolt), 7473  - Press CTRL-C to stop port forwarding and exit the script"
wait
