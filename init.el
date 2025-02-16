(require 'package)
;;;; Add package-archives
(add-to-list 'package-archives
             '("melpa" . "https://melpa.org/packages/") t)
;; Initialize
(package-initialize)

(require 'use-package)

(unless (package-installed-p 'vc-use-package)
  (package-vc-install "https://github.com/slotThe/vc-use-package"))
(require 'vc-use-package)

(use-package elfeed
  :ensure t
  :custom
  ((elfeed-use-curl t)
   (elfeed-set-timeout 36000)
   (elfeed-curl-extra-arguments '("--insecure")) ; necessary for https without a trust certificate
   (elfeed-web-start)))

(use-package simple-httpd
  :ensure t
  :config
  (setq httpd-host "0.0.0.0"))

(use-package elfeed-web
  :vc (elfeed-web :url "https://github.com/MasWag/elfeed"
                  :lisp-dir "web/")
  :after elfeed simple-httpd
  :ensure t
  :config
  (setq elfeed-web-data-root "/root/www")
  (defservlet* elfeed/content/:ref text/html ()
    "Serve content-addressable content at REF."
    (with-elfeed-web
      (let ((content (elfeed-deref (elfeed-ref--create :id ref))))
        (if content
            (princ (concat "<html><head><meta charset=\"utf-8\"></head><body>" content "</body></html>"))
          (princ (json-encode '(:error 404)))
          (httpd-send-header t "application/json" 404)))))
  (defservlet* elfeed/sync-pull application/json ()
    "Pull from remote."
    (with-elfeed-web
      (elfeed-sync-pull)
      (shell-command-to-string "mkdir -p ~/.elfeed/data/ && rsync -av backup:.elfeed/data/ ~/.elfeed/data/")))
  (defservlet* elfeed/sync-push application/json ()
    "Push from remote."
    (with-elfeed-web
      (elfeed-sync-push)))
  (defservlet* elfeed/feed-update application/json ()
    "Update all the feeds in `elfeed-feeds'."
    (with-elfeed-web
      (elfeed-update)))
  (defservlet* elfeed/mark-read/:webid application/json ()
    "Marks the given entry in the database as read."
    (with-elfeed-web
      (with-elfeed-db-visit (entry _)
        (when (string= webid (elfeed-web-make-webid entry))
          (elfeed-untag entry 'unread)))
      (princ (json-encode t))))
  (defservlet* elfeed/mark-unread/:webid application/json ()
    "Marks the given entry in the database as unread."
    (with-elfeed-web
      (with-elfeed-db-visit (entry _)
        (when (string= webid (elfeed-web-make-webid entry))
          (elfeed-tag entry 'unread)))
      (princ (json-encode t))))
  (defservlet* elfeed/mark-flagged/:webid application/json ()
    "Marks the given entry in the database as flagged."
    (with-elfeed-web
      (with-elfeed-db-visit (entry _)
        (when (string= webid (elfeed-web-make-webid entry))
          (elfeed-tag entry 'flagged)))
      (princ (json-encode t))))
  (defservlet* elfeed/mark-unflagged/:webid application/json ()
    "Marks the given entry in the database as unread."
    (with-elfeed-web
      (with-elfeed-db-visit (entry _)
        (when (string= webid (elfeed-web-make-webid entry))
          (elfeed-untag entry 'flagged)))
      (princ (json-encode t))))
  (elfeed-web-start))

(use-package async
  :ensure t)

(use-package elfeed-sync
  :vc (:fetcher github :repo MasWag/emacs-elfeed-sync)
  :after elfeed async
  :custom
  ;; The remote index path for synchronization. Any protocol supported by TRAMP can be used.
  (elfeed-sync-remote-index-path "/rsync:backup:.elfeed/index"))

;; load feeds.el if exits
(if (file-exists-p "/root/feeds.el")
    (load-file "/root/feeds.el"))

(provide 'init)
;;; init.el ends here
