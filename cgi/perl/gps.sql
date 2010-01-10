CREATE TABLE `gps` (
  `gpsid` bigint(20) unsigned NOT NULL auto_increment,
  `latitude` double(9,5) unsigned NOT NULL,
  `longitude` double(9,5) unsigned NOT NULL,
  `haccuracy` int(11) NOT NULL default '-1',
  `altitude` int(10) unsigned NOT NULL,
  `vaccuracy` int(11) NOT NULL default '-1',
  `speed` int(10) unsigned NOT NULL,
  `heading` double(6,3) unsigned NOT NULL,
  `readtime` datetime NOT NULL,
  `updated` timestamp NOT NULL default CURRENT_TIMESTAMP on update CURRENT_TIMESTAMP,
  PRIMARY KEY  (`gpsid`)
);
