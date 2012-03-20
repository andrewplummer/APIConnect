
require 'rubygems'
require 'json'
require 'pp'

fileout  = ARGV[0] || 'docs/methods.html'

fileout_html  = File.open(fileout, 'r').read if File.exists?(fileout)

@modules = {}


def get_property(prop, s, multiline = false)
  if multiline
    r = Regexp.new('@'+prop.to_s+'[\s*]+\*\n(.+)\*\n', Regexp::MULTILINE)
    match = s.scan(r)
    match[0][0].split(/\n/) if match[0]
  else
    match = s.match(Regexp.new('@'+prop.to_s+' (.*)'))
    match[1] if match
  end
end

def get_html_parameters(str)
  return nil if !str
  str.gsub!(/<(.+?)>/, '<span class="required parameter">\1</span>')
  str.gsub!(/\[(.+?)\]/, '<span class="optional parameter">\1</span>')
  str.gsub!(/%(.+?)%/, '<span class="code">\1</span>')
end

def get_method(s)
  raw = get_property(:method, s)
  match = raw.match(/(.+\.)?(.+)\((.+)?\)/)
  method = { :name => match[2] }
  if !!match[1]
    method[:class_method] = true
  end
  params = []
  accepts_unlimited_params = false
  if match[3]
    p = match[3].split(/,(?!')/)
    if p.last =~ /\.\.\./
      p.delete_at(-1)
      method[:accepts_unlimited_params] = true
    end
    params = p.to_enum(:each_with_index).map do |f,i|
      required = !!f.match(/<.+>/)
      name = f.match(/[<\[](.+)[>\]]/)[1]
      default = f.match(/ = (.+)/)
      css = ''
      css << 'required ' if required
      css << 'parameter'
      if default
        d = default[1]
        if d =~ /['"].*['"]/
          type = :string
          d.gsub!(/(['"])(.+)(['"])/, '\\1<span class="code">\\2</span>\\3')
        elsif d =~ /\d+/
          type = :number
        elsif d =~ /\/.+\//
          type = :regexp
        elsif d =~ /^null$/
          type = :null
        elsif d =~ /true|false/
          type = :boolean
        elsif d =~ /\{\}/
          type = :object
        end
        d = '<span class="' + type.to_s + ' code value">' + d + '</span>'
      end
      {
        :name => name,
        :type => type,
        :required => required,
        :default => default ? default[1] : nil
      }
    end
  else
    params = []
  end
  method[:params] = params
  method
end

def get_examples(s, name)
  lines = get_property(:example, s, true)
  return nil if !lines
  examples = []
  func = ''
  force_result = false
  lines.each do |l|
    l.gsub!(/^[\s*]+/, '')
    l.gsub!(/\s+->.+$/, '')
    if l =~ /^\s*\+/
      force_result = true
      l.gsub!(/\+/, '')
    end
    if l =~ /function/ && l !~ /isFunction/
      func << l
    elsif l =~ /^[^\(]+\);$/
      func << "\n" + l.gsub(/\s+->.+$/, '')
      examples << { :multi_line => true, :force_result => force_result, :html => func }
      func = ''
    elsif func.length > 0
      func << "\n" + l
    elsif !l.empty?
      examples << {
        :multi_line => false,
        :force_result => force_result,
        :html => l.gsub(/\s+->.+$/, '').gsub(/\\n/, '_NL_')
      }
    end
  end
  examples.each do |ex|
    clean(ex)
  end
  examples
end

def clean(m)
  m.each do |key, value|
    if value.nil? || value == false
      m.delete(key)
    end
  end
end


def extract_docs(package)
  @modules = {
    :apiconnect => []
  }
  @current_module = @modules[:apiconnect]
  File.open("lib/apiconnect.js", 'r') do |f|
    i = 0
    pos = 0
    f.read.scan(/\*\*\*.+?(?:\*\*\*\/|(?=\*\*\*))/m) do |b|
      if mod = b.match(/(\w+) module/)
        name = mod[1]
        if !@modules[name]
          @modules[name] = []
        end
        @current_module = @modules[name]
        @current_module_name = name
      else
        method = get_method(b)
        method[:package] = package
        method[:returns] = get_property(:returns, b)
        method[:short] = get_property(:short, b)
        method[:set] = get_property(:set, b)
        method[:extra] = get_property(:extra, b)
        method[:examples] = get_examples(b, method[:name])
        method[:alias] = get_property(:alias, b)
        method[:module] = @current_module_name
        get_html_parameters(method[:short])
        get_html_parameters(method[:extra])
        @current_module << method
        if method[:alias]
          method.delete_if { |k,v| v.nil? || (v.is_a?(Array) && v.empty?) }
          method[:short] = "Alias for <span class=\"code\">#{method[:alias]}</span>."
        end
        if method[:set]
          method[:pos] = pos
          pos += 1
        else
          pos = 0
        end
        if method[:name] =~ /\[/
          method[:set_base] = method[:name].gsub(/\w*\[(\w+?)\]\w*/, '\1')
          method[:name].gsub!(/[\[\]]/, '')
        end
        clean(method)
      end
    end
  end
end

#puts pp @modules

extract_docs(:core)

@modules.each do |name, mod|
  mod.sort! do |a,b|
    if a[:class_method] == b[:class_method]
      a[:name] <=> b[:name]
    else
      a[:class_method] ? -1 : 1
    end
  end
end

def examples_html(examples)
  return '' if examples.nil?
  tmp = []
  arr = []
  examples.each do |example|
    if example[:multi_line]
      tmp << example[:html]
    else
      arr << tmp.join("\n") if tmp != ''
      arr << example[:html]
      tmp = ''
    end
  end
  arr << tmp.join("\n") if tmp != ''
  html = arr.map do |el|
    "<p>#{el}</p>"
  end.join("\n")
  %Q(<div class="examples">#{html}</div>)
end

def method_html(method)
<<-HTML

<div class="method">
  <h3 class="name">#{method[:name]}</h3>
  <p class="description">
    <span class="short">#{method[:short]}</span>
    <span class="extra">#{method[:extra]}</span>
  </p>
  <p class="returns">#{method[:returns]}</p>
  #{examples_html(method[:examples])}
</div>
HTML
end

File.open(fileout, 'w') do |f|
  @modules[:apiconnect].each do |method|
    f.puts method_html(method)
  end
end
