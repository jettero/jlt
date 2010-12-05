#!/usr/bin/perl

use strict;
use Time::Local qw(timegm_nocheck);
use POSIX qw(strftime);
use Getopt::Long;
use Pod::Usage;

my $on;
my $less;
my $me = qr(org\.voltar);
my $continue;

Getopt::Long::Configure("bundling");
GetOptions(
    "help|H" => sub { pod2usage(-verbose=>1) },
    "h"      => sub { pod2usage() },
    "m=s"    => sub { $me = qr($_[1]) },
    "a"      => \$on,
    "c"      => \$continue,
) or pod2usage();

$SIG{INT} = sub { print "\nbye\n"; exit 0 };

my @start = ( map { strftime('%H:%M:%S', gmtime(time() + $_)) } (0,-1,+1) );
my $start = do { local $" = "|"; qr(@start) };

open my $dump, ($continue ? ">>":">"), "last_run.log" or die $!;

{ my $old = select STDIN; $| = 1; select $old }

# 2010-03-07T20:12:11.629669Z [7101] palm-webos-device user.info powerd: {powerd}:
my $reg = qr|^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).+?LunaSysMgr.*?{LunaSysMgrJS}:\s+|;
   $reg = qr|^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).+?\[\d+\] \S+ \S+ |;

while(<STDIN>) {
    $on = 1 if m/$start/;
    next unless $_ =~ $me;

    if( s/$reg// ) {
        my ($year, $month, $day, $hour, $min, $sec) = ($1, $2, $3, $4, $5, $6);
        $month =~ s/^0//; $month --;
        my $esec = timegm_nocheck($sec,$min,$hour,$day,$month,$year);
        my $time = strftime('%H:%M:%S', localtime($esec));

        s/ $me [.\w]*: \s+ //x;

        s(LunaSysMgr:\s+{LunaSysMgrJS}:\s+)();
        s(, file://.*)();
        s(, palmInitFramework\d+:\d+)();

        if( $on ) {
            print       "$time: $_";
            print $dump "$time: $_";
        }

    }
}

__END__

=head1 NAME

log-parse - parse webos log files into a human readable format

=head1 DESCRIPTION

blarg

=head1 SYNOPSIS

    app
       -h           help
       --help -H    full help

       -m RE        regular expression describing lines from this app (default: org\.voltar)
                    use . to just show everything.

       -a           By default, the app doesn't start showing things until it finds a line
                    from around +/- one second ago. -a instructs the log parser to skip that
                    check.

=head1 COPYRIGHT

Copyright 2010 -- Paul Miller C<< <jettero@cpan.org> >>

Licensed under the current version of the GPL.

=head1 SEE ALSO

perl(1)

=cut
