function ServerBrowser (targetElement) {
  const _this = this;

  this.$element = $(targetElement);
  const $filterPlaying = $('.servers__filters__playing', this.$element);
  const $filterWaiting = $('.servers__filters__waiting', this.$element);
  const $filterEmpty = $('.servers__filters__empty', this.$element);
  this.$refresh = $('.servers__refresh', this.$element);
  const $sortByName = $('.servers__sort__name', this.$element);
  const $sortByPlayers = $('.servers__sort__players', this.$element);
  const $sortByStatus = $('.servers__sort__status', this.$element);
  const $sortByLocation = $('.servers__sort__location', this.$element);
  this.$serversList = $('.servers__list__body', this.$element);
  this.$serverCount = $('.servers__server-count', this.$element);
  this.$playerCount = $('.servers__player-count', this.$element);

  this.filterState = {
    playing: true,
    waiting: true,
    empty: false
  };
  this.sortState = {
    by: 'status',
    direction: 'ascending'
  };
  this.servers = [];
  this.requestServerListTimeoutId;
  this.requestingServerList;
  this.serverCount = 0;
  this.playerCount = 0;

  // Interface bindings
  $filterPlaying.on('change', function handleFilterPlayingClick (event) {
    event.preventDefault();
    _this.filterState.playing = !_this.filterState.playing;
    $(_this).prop('checked', _this.filterState.playing);
    _this.renderServerList();
  });

  $filterWaiting.on('change', function handleFilterWaitingClick (event) {
    event.preventDefault();
    _this.filterState.waiting = !_this.filterState.waiting;
    $(_this).prop('checked', _this.filterState.waiting);
    _this.renderServerList();
  });

  $filterEmpty.on('change', function handleFilterEmptyClick (event) {
    event.preventDefault();
    _this.filterState.empty = !_this.filterState.empty;
    $(_this).prop('checked', _this.filterState.empty);
    _this.renderServerList();
  });

  this.$refresh.on('click', function handleRefreshClick () {
    _this.requestServerList();
  });

  $sortByName.on('click', function (event) {
    event.preventDefault();
    _this.setSortState('name');
    _this.renderServerList();
  });

  $sortByPlayers.on('click', function (event) {
    event.preventDefault();
    _this.setSortState('players');
    _this.renderServerList();
  });

  $sortByStatus.on('click', function (event) {
    event.preventDefault();
    _this.setSortState('status');
    _this.renderServerList();
  });

  $sortByLocation.on('click', function (event) {
    event.preventDefault();
    _this.setSortState('location');
    _this.renderServerList();
  });

  this.renderLoadingPlaceholder();
  this.requestServerList();

  return this;
}

ServerBrowser.prototype.renderServerListing = function renderServerListing (serverResult) {
  const $serverListing = ServerBrowser.$serverListingTemplate.contents().clone();
  const canJoin = (
    (serverResult.__status === 'waiting' && serverResult.players < serverResult.maxplayers)
    || serverResult.__status === 'empty'
  );
  const statusClassString = 'badge servers__listing__status__badge servers__listing__status__badge--' + serverResult.__status;
  const $statusBadge = $('<span class="' + statusClassString + '">' + serverResult.__status + '</span>');

  $('.servers__listing__name', $serverListing).text(serverResult.name);
  if (serverResult.protected) {
    $('.servers__listing__name', $serverListing).prepend('<svg class="icon"><use xlink:href="/images/icons/icons.svg#icon-lock"></use></svg>');
  }
  $('.servers__listing__status', $serverListing).append($statusBadge);
  $('.servers__listing__players', $serverListing).text(serverResult.players + ' / ' + serverResult.maxplayers);
  if (canJoin) {
    const $joinLink = $('<a class="servers__listing__join">Join</a>');
    $joinLink.prop('href', ServerBrowser.getJoinUrl(serverResult));
    $('.servers__listing__join', $serverListing).append($joinLink);
  }
  $('.servers__listing__location', $serverListing).text(serverResult.location);

  return $serverListing;
}

ServerBrowser.prototype.renderServerGroups = function renderServerGroups (serverGroupsArray) {
  let $serverListings = []

  for (serverGroup of serverGroupsArray) {
    const $serverGroupHeader = ServerBrowser.$serverGroupHeaderTemplate.contents().clone();
    const $modIconImg = serverGroup.modMetadata.icon
      ? $('<img class="servers__list__group__mod-icon" />').prop('src', serverGroup.modMetadata.icon)
      : null;
    
    $('.servers__list__group__info', $serverGroupHeader).prepend($modIconImg);
    $('.servers__list__group__mod-link', $serverGroupHeader).prop('href', serverGroup.modMetadata.website);
    $('.servers__list__group__mod-link', $serverGroupHeader).text(serverGroup.modMetadata.title);
    $('.servers__list__group__version', $serverGroupHeader).text('[' + serverGroup.version + ']');
    $('.servers__list__group__players > var', $serverGroupHeader).text(serverGroup.players);

    $serverListings.push($serverGroupHeader);
    $serverListings = $serverListings.concat(serverGroup.servers.map(this.renderServerListing));
  }

  return $serverListings;
}

ServerBrowser.prototype.renderServerList = function renderServerList () {
  const filteredAndSortedServers = ServerBrowser.filterAndSortServers(this.servers, this.filterState, this.sortState);

  // get player counts out of the way
  this.countServersAndPlayers(filteredAndSortedServers);
  this.$serverCount.text(this.serverCount);
  this.$playerCount.text(this.playerCount);

  const serverGroups = ServerBrowser.groupServersByModAndRelease(filteredAndSortedServers);
  const sortedServerGroupsArray = ServerBrowser.getSortedServerGroupsArray(serverGroups);
  const $serverGroups = this.renderServerGroups(sortedServerGroupsArray);

  this.$serversList.html($serverGroups);

  // reset sort columns
  $('.servers__list__header__sort-toggle', this.$element).removeClass('servers__list__header__sort-toggle--ascending');
  $('.servers__list__header__sort-toggle', this.$element).removeClass('servers__list__header__sort-toggle--descending');
  $('.servers__sort__' + this.sortState.by, this.$element).addClass('servers__list__header__sort-toggle--' + this.sortState.direction);
}

ServerBrowser.prototype.renderLoadingPlaceholder = function renderLoadingPlaceholder () {
  for (let i = 0; i <= 15; i++) {
    const $serverListing = ServerBrowser.$serverListingTemplate.contents().clone();
    const nameWidth = (1.2 - Math.random()) * 225;
    const locationWidth = (1.5 - Math.random()) * 100;
    $('.servers__listing__name', $serverListing).html('<span class="u-placeholder" style="width: ' + nameWidth + 'px;" />');
    $('.servers__listing__status', $serverListing).html('<span class="u-placeholder" style="width: 70px;" />');
    $('.servers__listing__mod', $serverListing).html('<span class="u-placeholder" />');
    $('.servers__listing__players', $serverListing).html('<span class="u-placeholder" style="width: 40px;" />');
    $('.servers__listing__location', $serverListing).html('<span class="u-placeholder" style="width: ' + locationWidth + 'px;" />');

    this.$serversList.append($serverListing);
  }
}

ServerBrowser.prototype.requestServerList = function requestServerList () {
  const _this = this;
  this.requestingServerList = true;
  this.$refresh.prop('disabled', true);
  $.getJSON('https://master.openra.net/games?protocol=2&type=json', function (gameResults) {
    _this.requestingServerList = false;
    _this.$refresh.prop('disabled', false);
    _this.servers = ServerBrowser.processGameResults(gameResults);
    _this.renderServerList();
  });

  clearTimeout(this.requestServerListTimeoutId);
  this.requestServerListTimeoutId = setTimeout(function () {
    _this.requestServerList();
  }, 30 * 1000);
}

ServerBrowser.prototype.setSortState = function setSortState (by) {
  this.sortState.direction = (this.sortState.by === by && this.sortState.direction === 'ascending')
    ? 'descending'
    : 'ascending';
  this.sortState.by = by;
}

ServerBrowser.prototype.countServersAndPlayers = function countServersAndPlayers (servers) {
  this.serverCount = 0;
  this.playerCount = 0;

  for (server of servers) {
    this.serverCount++;
    this.playerCount += server.players;
  }
}

// Static

ServerBrowser.$serverListingTemplate = $('#server-row-template');
ServerBrowser.$serverGroupHeaderTemplate = $('#server-group-header-template');

ServerBrowser.stateSortOrder = {
  waiting: 1,
  playing: 2,
  empty: 3
};

ServerBrowser.compareText = function compareText (textA, textB) {
  textA = textA.toUpperCase();
  textB = textB.toUpperCase();
  let sortValue = 0;
  if (textA > textB) {
    sortValue = -1;
  } else if (textA < textB) {
    sortValue = 1;
  }
  return sortValue;
}

ServerBrowser.getModMetadata = function getModMetadata (server) {
  // New format mods include the correct metadata already
  if (server.modtitle) {
    return {
      // Limit title length to avoid breakage
      title: server.modtitle.substring(0, 50),
      icon: server.modicon32,
      website: server.modwebsite
    };
  }

  // Generate data for older official mods
  switch (server.mod) {
    case 'ra':
      return {
        title: 'Red Alert',
        icon: 'https://www.openra.net/images/icons/ra_32x32.png',
        website: 'https://www.openra.net'
      };
    
    case 'cnc':
      return {
        title: 'Tiberian Dawn',
        icon: 'https://www.openra.net/images/icons/cnc_32x32.png',
        website: 'https://www.openra.net'
      };
    
    case 'd2k':
      return {
        title: 'Dune 2000',
        icon: 'https://www.openra.net/images/icons/d2k_32x32.png',
        website: 'https://www.openra.net'
      };
    
    default:
      return {
        title: 'Unknown Mod "' + server.mod + '"',
        icon: '',
        website: ''
      };
  }
}

ServerBrowser.getJoinUrl = function getJoinUrl (server) {
  return 'openra-' + server.mod + '-' + server.version + '://' + server.address;
}

ServerBrowser.getServerStatus = function getServerStatus (server) {
  switch (server.state) {
    case 2:
      return 'playing';
    case 1:
      if (server.players > 0) {
        return 'waiting';
      }
    default:
      return 'empty';
  }
}

ServerBrowser.processGameResults = function processGameResults (gameResults) {
  const processedGameResults = gameResults.map(function (server) {
    server.__status = ServerBrowser.getServerStatus(server);
    server.__modMetadata = ServerBrowser.getModMetadata(server);
    return server;
  });

  return processedGameResults;
}

ServerBrowser.filterServers = function filterServers (serversToFilter, filterState) {
  return serversToFilter.filter(function (server) {
    if (!filterState.playing && server.__status === 'playing') {
      return false;
    }

    if (!filterState.waiting && server.__status === 'waiting') {
      return false;
    }

    if (!filterState.empty && server.__status === 'empty') {
      return false;
    }

    return true;
  });
}

ServerBrowser.sortServers = function sortServers (serversToSort, sortState) {
  return serversToSort.sort(function (serverA, serverB) {
    let sortValue = 0;
    if (sortState.by === 'name') {
      sortValue = ServerBrowser.compareText(serverA.name, serverB.name);
    }
    if (sortState.by === 'status') {
      sortValue = (ServerBrowser.stateSortOrder[serverA.__status] - ServerBrowser.stateSortOrder[serverB.__status]) * -1;
    }
    if (sortState.by === 'players') {
      sortValue = serverA.players - serverB.players;
    }
    if (sortState.by === 'location') {
      sortValue = ServerBrowser.compareText(serverA.location, serverB.location);
    }
    if (sortState.direction === 'ascending') {
      sortValue = sortValue * -1;
    }
    return sortValue;
  });
}

ServerBrowser.filterAndSortServers = function filterAndSortServers (serversToFilterAndSort, filterState, sortState) {
  const filteredServers = ServerBrowser.filterServers(serversToFilterAndSort, filterState);
  const filteredAndSortedServers = ServerBrowser.sortServers(filteredServers, sortState);

  return filteredAndSortedServers;
}

ServerBrowser.groupServersByModAndRelease = function groupServersByModAndRelease (servers) {
  const serverGroups = {};

  for (server of servers) {
    const key = server.__modMetadata.title + '-' + server.version;
    if (!serverGroups[key]) {
      serverGroups[key] = {
        players: 0,
        servers: [],
        version: server.version,
        modMetadata: server.__modMetadata
      };
    }

    serverGroups[key].players += server.players;
    serverGroups[key].servers.push(server);
  }

  return serverGroups;
}

// Turn server groups object into array
// Sort generated array by # of players
ServerBrowser.getSortedServerGroupsArray = function getSortedServerGroupsArray (serverGroups) {
  const serverGroupsArray = Object.keys(serverGroups).map(function (serverGroupKey) {
    return serverGroups[serverGroupKey];
  });
  const sortedServerGroups = serverGroupsArray.sort(function (serverGroupA, serverGroupB) {
    return serverGroupB.players - serverGroupA.players;
  });

  return sortedServerGroups;
}

new ServerBrowser('#server-browser');