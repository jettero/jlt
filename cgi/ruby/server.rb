require 'rubygems'
require 'sinatra'
require 'json'

post '/location' do
  # var item = {
  #   t: result.timestamp,
  #   ll: [ result.latitude, result.longitude ],
  #   ha: result.horizAccuracy,
  #   va: result.vertAccuracy,
  #   al: result.altitude,
  #   vv: [ result.velocity, result.heading ]
  # };
  fixes = []
  fixes = JSON.parse(params[:fixes]) if params[:fixes]

  t_list = []
  fixes.each do |f|
    puts f.inspect

    # Validate
    missing_keys = ["t", "ll", "ha", "va", "al", "vv"].select{|k| not f.keys.include? k }
    next unless missing_keys.empty?

    # Find the first time stamp
    if f['t'].is_a? Array
      timestamp = f['t'].first
    else
      timestamp = f['t']
    end

    # Save the data
    open("points", "a") do |file|
      file.write("#{timestamp} #{f['ll'][0]} #{f['ll'][1]} #{f['vv'][0]} #{f['vv'][1]}\n")
    end

    t_list << timestamp
  end

  {'fix_tlist' => t_list}.to_json
end
