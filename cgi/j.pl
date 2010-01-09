#!/usr/bin/perl

use strict;
use warnings;
use CGI;
use CGI::Carp qw(fatalsToBrowser);
use MySQL::Easy;
use JSON;
use Math::Units::PhysicalValue qw(PV);

my $json = new JSON;
my $cgi = new CGI;
my $dbo = MySQL::Easy->new("blarg"); $dbo->set_host("localhost"); $dbo->set_user("blarg"); $dbo->set_pass("blarg");
my $sth = $dbo->ready("select latitude, longitude, speed, heading, readtime from gps
                        where updated >= date_sub(now(), interval 1 hour)
                        order by readtime desc limit 1");

$sth->execute;
$sth->bind_columns( \( my ($lat, $lon, $speed, $heading, $readtime)));

print $cgi->header(-type=>"text/javascript", -charset=>'UTF-8');
if( $sth->fetch ) {
    my $velocity = "n/a";
    if( $speed >= 1 ) {
        $speed = PV($speed . " meters/s");
        $speed += "0 miles/hour";

        $velocity = "$speed @ $heading \&deg;";
    }


    print $json->encode({
        found => $json->true,
        l     => [$lat, $lon],
        html  => $cgi->table(
            $cgi->Tr( $cgi->td([ 'location: ', "[$lat, $lon]" ]) ),
            $cgi->Tr( $cgi->td([ 'reading:  ',  $readtime ]) ),
            $cgi->Tr( $cgi->td([ 'velocity: ', $velocity ]) ),
        ),
    });

} else {
    print $json->encode({found=>$json->false});
}
