# Use trixie-slim as base image since we need Emacs >= 29
FROM debian:trixie-slim
LABEL maintainer="masakiwaga@gmail.com"

# Set the working directory
WORKDIR /root

# Install the required packages
RUN apt-get update && apt-get install -y \
    emacs \
    git \
    rsync \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Make ~/.emacs.d directory and copy the init.el file
RUN mkdir -p /root/.emacs.d
COPY init.el /root/.emacs.d/init.el
COPY feeds.el /root/feeds.el

# Execute Emacs to install the packages
RUN emacs --batch --load ~/.emacs.d/init.el

# Make ~/.ssh directory and copy the config file and the private key
RUN mkdir -p /root/.ssh && chmod 700 /root/.ssh
COPY ssh_config /root/.ssh/config
COPY id_ed25519 /root/.ssh/id_ed25519
RUN echo 'eval $(ssh-agent)' >> .profile

RUN mkdir /root/.elfeed

# Copy the html files
COPY www /root/www
