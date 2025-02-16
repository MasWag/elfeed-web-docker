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

angular.module('elfeedApp', [])
  .controller('SearchCtrl', ['$scope', '$http', function($scope, $http) {
    $scope.query = INITIAL_QUERY;
    $scope.busy = false;
    $scope.dirty = true;

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

    $scope.selected = null;
    $scope.show = function(entry) {
      $scope.selected = entry;
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
