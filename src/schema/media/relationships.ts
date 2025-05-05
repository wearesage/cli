import {
  Artist,
  Album,
  Song,
  Tour,
  Residency,
  Media,
  Annotation,
  LyricSection,
  RecordLabel,
  Product,
  Organization,
  Award,
  Genre,
  Theme,
  User,
  Source,
  LinguisticDevice,
} from "./nodes";

export interface BornIn {
  from: Artist;
  to: Location;
}

export interface HasFamilyRelationship {
  from: Artist;
  to: Artist;
  type: string; // e.g., 'Spouse', 'Parent', 'Child', 'Sibling'
  startDate?: Date;
  endDate?: Date;
}

export interface Released {
  from: Artist;
  to: Album | Song;
}

export interface Headlined {
  from: Artist;
  to: Tour | Residency;
}

export interface CollaboratedOn {
  from: Artist;
  to: Song;
}

export interface Wrote {
  from: Artist;
  to: Song;
}

export interface Produced {
  from: Artist;
  to: Song;
}

export interface SignedWith {
  from: Artist;
  to: RecordLabel;
  startYear: number;
  endYear?: number;
}

export interface ActedIn {
  from: Artist;
  to: Media;
  // Media type is 'Film' or 'TVShow'
}

export interface VoicedIn {
  from: Artist;
  to: Media;
  // Media type is 'Film'
}

export interface AppearedIn {
  from: Artist;
  to: Media;
  // Media type can be any
}

export interface Judged {
  from: Artist;
  to: Media;
  // Media type is 'TVShow'
}

export interface Hosted {
  from: Artist;
  to: Event;
}

export interface PerformedAt {
  from: Artist;
  to: Event;
}

export interface InfluencedBy {
  from: Artist;
  to: Artist | Album;
}

export interface Endorsed {
  from: Artist;
  to: Product;
}

export interface Launched {
  from: Artist;
  to: Product;
}

export interface Founded {
  from: Artist;
  to: RecordLabel;
}

export interface Supports {
  from: Artist;
  to: Organization;
}

export interface AmbassadorFor {
  from: Artist;
  to: Organization;
}

export interface Contains {
  from: Album;
  to: Song;
}

export interface ReleasedBy {
  from: Album | Song;
  to: RecordLabel;
}

export interface Received {
  from: Artist | Album | Song | Media;
  to: Award;
}

export interface HasGenre {
  from: Album | Song;
  to: Genre;
}

// Tour relationships
export interface Supported {
  from: Tour;
  to: Album;
}

// Song relationships
export interface Featuring {
  from: Song;
  to: Artist;
}

export interface MusicVideoFor {
  from: Song;
  to: Media;
  // Media type is 'MusicVideo'
}

export interface HasLyrics {
  from: Song;
  to: LyricSection;
}

export interface ExploresTheme {
  from: LyricSection | Song | Album;
  to: Theme;
}

// Event relationships
export interface HeldIn {
  from: Event;
  to: Location;
}

// Lyric section relationships
export interface IsAnnotatedBy {
  from: LyricSection;
  to: Annotation;
}

export interface EmploysDevice {
  from: LyricSection;
  to: LinguisticDevice;
}

// Annotation relationships
export interface ReferencesSource {
  from: Annotation;
  to: Source;
}

export interface ProvidedByUser {
  from: Annotation;
  to: User;
}

export interface IdentifiesTheme {
  from: Annotation;
  to: Theme;
}

export interface IdentifiesDevice {
  from: Annotation;
  to: LinguisticDevice;
}
