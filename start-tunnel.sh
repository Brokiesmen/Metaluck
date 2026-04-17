#!/bin/bash
# SSH tunnel via localhost.run for minigames
exec ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -R 80:localhost:3001 nokey@localhost.run
