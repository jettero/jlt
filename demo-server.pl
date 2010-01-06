#!/usr/bin/perl

use strict;
use warnings;
use Getopt::Long;
use Pod::Usage;
use HTTP::Server::Simple;
use base qw(HTTP::Server::Simple::CGI);

sub handle_request {
    my ($this, $cgi) = @_;

    print "Content-Type: text/plain\n\n";
    print "hiya!!\n";
}

my $start = "run";
my $port  = 4000;

Getopt::Long::Configure("bundling");
GetOptions(
    "background|daemon|b|d" => sub { $start = "background" },
    "port|p=i" => \$port,
    "help|H" => sub { pod2usage(-verbose=>1) },
    "h"      => sub { pod2usage() },

) or pod2usage();

my $server = main->new($port);
   $server->$start;

__END__

=head1 NAME

demo-server - a very simple demo tracking server

=head1 DESCRIPTION

This is just a quick little HTTP::Server::Simple demo GPS tracking server.
Choose your own language (ruby, python, php) as the protocol is very simple!
I'm a perl fan. :p

=head1 SYNOPSIS

    demo-server.pl
       --daemon --background -b -d   start the server in the background
       --port -p                     specify a port to use (default: 4000)
       -h                            short help
       --help -H                     full help

=head1 OPTIONS

=over

=item B<--daemon> B<--background> B<-b> B<-d>

Background mode.  Once the server starts, it should background immediately.

=item B<--port> B<-p>

Speicify a port to run on.

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
