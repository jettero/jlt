#!/usr/bin/perl

use strict;
use warnings;
use CGI;
use CGI::Carp qw(fatalsToBrowser);
use JSON;
use MySQL::Easy;
use POSIX;

my $cgi  = new CGI;
my $json = new JSON;
my $dbo  = MySQL::Easy->new("blarg"); $dbo->set_host("localhost"); $dbo->set_user("blarg"); $dbo->set_pass("blarg");
my $sth  = $dbo->ready("insert ignore into gps set latitude=?, longitude=?, haccuracy=?, altitude=?,
    vaccuracy=?, speed=?, heading=?, readtime=?");

my $fix_tlist = [];

if( my $json_fixes = $cgi->param("fixes") ) {
    if( ref (my $fixes = eval { $json->decode($json_fixes) }) ) {

        handle_fix( $_, $fix_tlist ) for @$fixes;

    }
}

print $cgi->header("text/javascript");
print $json->encode({fix_tlist=>$fix_tlist});


sub handle_fix {
    my ($fix) = @_;

    return unless ref $fix eq "HASH";

    for my $k (qw(t ll vv al ha va)) {
        # NOTE: the request is malformed without these keys
        return unless exists $fix->{$k};
    }

    my @t = do {
        my $t = delete $fix->{t};

        ref $t ? @$t : $t;
    };

    for my $t (@t) {
        $sth->execute(
            @{ $fix->{ll} },
            $fix->{ha},
            $fix->{al},
            $fix->{va},
            @{ $fix->{vv} },
            strftime('%Y-%m-%d %H:%M:%S', localtime( int($t/1000)) ),
        );
    }

    push @$fix_tlist, $t[0];
}
