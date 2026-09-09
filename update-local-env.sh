#!/bin/bash
IP=$(hostname -I | awk '{print $1}')
sed -i "s|VITE_SUPABASE_URL=.*|VITE_SUPABASE_URL=http://$IP:54321|" .env.local
echo "Updated VITE_SUPABASE_URL to http://$IP:54321"