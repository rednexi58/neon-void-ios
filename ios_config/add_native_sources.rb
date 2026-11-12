# Adds app-local native sources to the freshly generated Capacitor Xcode project.
# Runs on Codemagic (macOS) after `cap sync`. The xcodeproj gem ships with CocoaPods.
#   - ios_config/native/*.swift          -> App target, Compile Sources
#   - ios_config/native/<lang>.lproj/... -> App target, Copy Bundle Resources (localized)
# Idempotent: running twice does not add duplicates. Exits non-zero on any problem so a
# broken project fails the build instead of shipping.
require 'fileutils'
require 'xcodeproj'

ROOT = File.expand_path('..', __dir__)
APP_DIR = File.join(ROOT, 'ios/App/App')
PROJECT_PATH = File.join(ROOT, 'ios/App/App.xcodeproj')
NATIVE_DIR = File.join(ROOT, 'ios_config/native')
LANGS = %w[en tr].freeze

abort("Xcode project not found: #{PROJECT_PATH}") unless File.directory?(PROJECT_PATH)

project = Xcodeproj::Project.open(PROJECT_PATH)
target = project.targets.find { |t| t.name == 'App' } or abort('App target not found')
group = project.main_group.find_subpath('App', false) or abort('App group not found')

# Swift sources
Dir[File.join(NATIVE_DIR, '*.swift')].sort.each do |src|
  name = File.basename(src)
  FileUtils.cp(src, File.join(APP_DIR, name))
  ref = group.files.find { |f| f.path == name } || group.new_reference(name)
  target.source_build_phase.add_file_reference(ref, true)
  puts "Swift source added: #{name}"
end

# Localized InfoPlist.strings (variant group = one localized resource)
variant = group.children.find { |c| c.isa == 'PBXVariantGroup' && c.name == 'InfoPlist.strings' } ||
          group.new_variant_group('InfoPlist.strings')
LANGS.each do |lang|
  src = File.join(NATIVE_DIR, "#{lang}.lproj", 'InfoPlist.strings')
  abort("Missing #{src}") unless File.file?(src)
  dest_dir = File.join(APP_DIR, "#{lang}.lproj")
  FileUtils.mkdir_p(dest_dir)
  FileUtils.cp(src, File.join(dest_dir, 'InfoPlist.strings'))
  rel = "#{lang}.lproj/InfoPlist.strings"
  unless variant.files.any? { |f| f.path == rel }
    ref = variant.new_reference(rel)
    ref.name = lang
  end
end
target.resources_build_phase.add_file_reference(variant, true)

project.root_object.known_regions = (project.root_object.known_regions | LANGS | ['Base']).uniq
project.root_object.development_region = 'tr'
project.save
puts "Localizations registered: #{LANGS.join(', ')}"
