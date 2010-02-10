CREATE TABLE `gps` (
  `gpsid` bigint(20) unsigned NOT NULL auto_increment,
  `latitude` double(9,5) NOT NULL,
  `longitude` double(9,5) NOT NULL,
  `haccuracy` int(11) NOT NULL default '-1',
  `altitude` int(11) NOT NULL,
  `vaccuracy` int(11) NOT NULL default '-1',
  `speed` int(10) unsigned NOT NULL,
  `heading` double(6,3) unsigned NOT NULL,
  `readtime` datetime NOT NULL,
  `updated` timestamp NOT NULL,
  PRIMARY KEY  (`gpsid`),
  UNIQUE KEY `readtime` (`readtime`)
);
