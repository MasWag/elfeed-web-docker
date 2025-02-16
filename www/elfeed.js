var INITIAL_QUERY = '@3-days-old +unread';

function favicon(url) {
  return URI(url)
    .path('favicon.ico')
    .search('')
    .toString()
    .replace(/\?$/, '');
}

function entryFill(entry) {
  entry.favicon = favicon(entry.link);
  var date = new Date(entry.date);
  entry.dateString = [
    1900 + date.getYear(),
    1 + date.getMonth(),
    date.getDate()
  ].join('-');
  entry.classes = entry.tags.map(function(tag) {
    return 'tag-' + tag;
  }).join(' ');
}

angular.module('elfeedApp', ['toastr'])
  .controller('SearchCtrl', ['$scope', '$http', 'toastr', function($scope, $http, toastr) {
    $scope.query = INITIAL_QUERY;
    $scope.busy = false;
    $scope.dirty = true;
    $scope.articleMenu = false;

    $scope.update = function(blur) {
      if (!$scope.busy) {
        $scope.busy = true;
        $scope.dirty = false;
        $http.get(URI('/elfeed/search').search({ q: $scope.query }).toString())
          .then(function(response) {
            var data = response.data;
            data.forEach(entryFill);
            $scope.entries = data;
            $scope.busy = false;
            if ($scope.dirty) $scope.update();
          }, function(error) {
            console.error("Error fetching entries:", error);
            $scope.busy = false;
          });
      } else {
        $scope.dirty = true;
      }

      if (blur) {
        // Blur the input field after updating
        document.getElementById('query').blur();
      }
    };

    $scope.time = 0;
    function poll() {
      $http.get(URI('/elfeed/update').search({ time: $scope.time }).toString())
        .then(function(response) {
          var data = response.data;
          $scope.time = data;
          $scope.update();
          poll();
        }, function(error) {
          console.error("Error polling for updates:", error);
          poll(); // Optionally, decide if you want to continue polling on error
        });
    }
    poll();

    $scope.getContentUrl = function(content) {
      return 'content/' + content;
    };

    $scope.selected = null;
    $scope.show = function(entry) {
      $scope.selected = entry;
      $scope.articleMenu = true;
    };

    $scope.markAllRead = function() {
      $http.get(URI('/elfeed/mark-all-read'));
      $scope.update();
    };

    $scope.markRead = function(webid) {
      $http.get(URI('/elfeed/mark-read/' + webid));
      $scope.update();
    };

    $scope.markUnread = function(webid) {
      $http.get(URI('/elfeed/mark-unread/' + webid));
      $scope.update();
    };

    $scope.closeMenu = function() {
      console.log('close menu');
      $scope.articleMenu = false;
    };

    $scope.toggleRead = function(selected) {
      let uri = '';
      if (selected.classes.includes('tag-unread')) {
        console.log('Mark ' + selected.title + ' as read');
        // Remove 'tag-unread' from classes and trim extra spaces
        selected.classes = selected.classes.replace('tag-unread', '').trim();
        uri = URI('/elfeed/mark-read/' + selected.webid).toString();
      } else {
        console.log('Mark ' + selected.title + ' as unread');
        // Add 'tag-unread' to classes
        selected.classes += ' tag-unread';
        uri = URI('/elfeed/mark-unread/' + selected.webid).toString();
      }
      $http.get(uri)
        .then(function(response) {
          $scope.update();
        })
        .catch(function(error) {
          console.error("Error toggling read status:", error);
        });
    };

    $scope.toggleFlag = function(selected) {
      let uri = '';
      if (selected.classes.includes('tag-flagged')) {
        uri = URI('/elfeed/mark-unflagged/' + selected.webid).toString();
        // Remove 'tag-flagged' from classes and trim extra spaces
        selected.classes = selected.classes.replace('tag-flagged', '').trim();
      } else {
        console.log('/elfeed/mark-flagged/' + selected.webid);
        uri = URI('/elfeed/mark-flagged/' + selected.webid).toString();
        // Add 'tag-flagged' to classes
        selected.classes += ' tag-flagged';
      }
      $http.get(uri)
        .then(function(response) {
          $scope.update();
        })
        .catch(function(error) {
          console.error("Error toggling flagged status:", error);
        });
    };
  }])
  .filter('youtubeEmbed', ['$sce', function($sce) {
    return function(link) {
      if (!link) return;
      var embedLink = link.replace('watch?v=', 'embed/');
      return $sce.trustAsResourceUrl(embedLink);
    };
  }]);
angular.module('elfeedApp')
  .filter('trustedUrl', ['$sce', function($sce) {
    return function(url) {
      return $sce.trustAsResourceUrl(url);
    };
  }]);

angular.module('elfeedApp')
  .controller('MenuCtrl', ['$scope', '$http', 'toastr', function($scope, $http, toastr) {
    $scope.isMenuOpen = false;

    $scope.toggleMenu = function() {
      $scope.isMenuOpen = !$scope.isMenuOpen;
    };

    $scope.pull = function() {
      console.log("Pull action triggered");
      toastr.info('Started pulling the feeds');
      $http.get(URI('/elfeed/sync-pull').toString())
        .then(function(response) {
          $scope.update();
          // Show a success toast message
          console.log("Successfully pulled the feeds");
          toastr.success('Successfully pulled the feeds', 'Success');
        }).catch(function(error) {
          console.log("Error pulling the feeds");
          toastr.error('Error pulling the feeds', 'Error');
        });
    };

    $scope.push = function() {
      console.log("Push action triggered");
      toastr.info('Started pushing the feeds');
      $http.get(URI('/elfeed/sync-push').toString())
        .then(function(response) {
          $scope.update();
          // Show a success toast message
          console.log("Successfully pushed the feeds");
          toastr.success('Successfully pushed the feeds', 'Success');
        }).catch(function(error) {
          console.log("Error pushing the feeds");
          toastr.error('Error pushing the feeds', 'Error');
        });
    };

    $scope.feedUpdate = function() {
      console.log("Feed update action triggered");
      toastr.info('Started updating the feeds');
      $http.get(URI('/elfeed/feed-update').toString())
        .then(function(response) {
          $scope.update();
          // Show a success toast message
          console.log("Feed is updated");
          toastr.success('Feed is updated', 'Success');
        }).catch(function(error) {
          console.log("Error updating the feeds");
          toastr.error('Error updating the feeds', 'Error');
        });
    };
  }]);
