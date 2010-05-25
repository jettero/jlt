#!/usr/bin/perl

use strict;
use warnings;
use Getopt::Long;
use Pod::Usage;
use HTTP::Server::Simple;
use base qw(HTTP::Server::Simple::CGI);
use JSON;

$0 = "test-server.pl";
my $json = JSON->new;
my $start = "run";
my $port  = 4000;
my $sleep;
my $auth_url;
my $view_url;

Getopt::Long::Configure("bundling");
GetOptions(
    "background|daemon|b|d" => sub { $start = "background" },
    "port|p=i" => \$port,
    "sleep|s=i" => \$sleep,

    "auth_url|a=s" => \$auth_url,
    "view_url|v=s" => \$view_url,

    "help|H" => sub { pod2usage(-verbose=>1) },
    "h"      => sub { pod2usage() },

) or pod2usage();

my $server = main->new($port);
   $server->$start;

sub handle_fix {
    my ($this, $fix, $fix_tlist) = @_;

    return unless ref $fix eq "HASH";

    for my $k (qw(t ll vv al ha va)) {
        # NOTE: the request is malformed without these keys
        return unless exists $fix->{$k};
    }

    my $t = delete $fix->{t};
       $t = $t->[0] if ref $t;

    push @$fix_tlist, $t;
}

sub handle_request {
    my ($this, $cgi) = @_;

    sleep rand $sleep if $sleep;

    my $fix_tlist = [];
    if( my $json_fixes = $cgi->param("fixes") ) {
        my $fixes = eval { $json->decode($json_fixes) };
        if( not ref $fixes ) {
            print "HTTP/1.0 400 JSON error\r\nContent-Type: text/plain\r\n\r\n$@";
            warn "invalid json: $@\n";
            return;
        }

        $this->handle_fix( $_, $fix_tlist ) for @$fixes;
    }

    my $j = $json->encode({ fix_tlist=>$fix_tlist });
    print "HTTP/1.0 200 OK\r\nContent-Type: text/javascript\r\n\r\n$j\r\n";
    warn "json: $j\n" if $start ne "background";
}

__END__

=head1 NAME

test-server.pl - a very simple test tracking server

=head1 DESCRIPTION

This is just a quick little HTTP::Server::Simple GPS tracking server useful for testing purposes only.

=head1 SYNOPSIS

    test-server.pl
       --daemon --background -b -d   start the server in the background
       --port -p                     specify a port to use (default: 4000)
       -h                            short help
       --help -H                     full help

       --view_url -v    URL to deliver to the client as the view url
       --auth_url -a    URL to deliver to the client as the auth url

=head1 OPTIONS

=over

=item B<--daemon> B<--background> B<-b> B<-d>

Background mode.  Once the server starts, it should background immediately.

=item B<--port> B<-p>

Speicify a port to run on.

=item B<--sleep> B<-s>

Randomly sleep for 0 - x seconds during the handler process.

=item B<--auth> B<-a>

Auth url to deliver to the client.

=item B<--view> B<-v>

Auth url to deliver to the client.

=item B<-h>

Short help.

=item B<-H> B<--help>

Long help (this).

=back

=head1 COPYRIGHT

Copyright 2009 -- Paul Miller C<< <jettero@cpan.org> >>

Licensed under the current version of the GPL.

=head1 REPORTING BUGS

Bugs can be reported under either github, email, or rt.cpan -- whichever seems most appropriate.

L<http://github.com/jettero/>

=head1 SEE ALSO

perl(1)

=cut
