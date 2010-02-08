#!/usr/bin/perl

use strict;
use Time::Local qw(timegm_nocheck);
use POSIX qw(strftime);

my $old = select STDIN; $| = 1;
select $old; $| = 1;

while(<STDIN>) {
    if( s/(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2}:\d{2}).+?LunaSysMgr.*?{LunaSysMgrJS}:\s+// ) {
        my ($year, $month, $day, $hour, $min, $sec) = ($1, $2, $3, $4, $5, $6);
        $month =~ s/^0//; $month --;
        my $esec = timegm_nocheck($sec,$min,$hour,$day,$month,$year);
        my $time = strftime('%H:%M:%S', localtime($esec));

        s(, file://.*)();

        print "$time: $_";
    }
}

